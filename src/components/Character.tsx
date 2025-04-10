import React, { useRef, useEffect, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CharacterProps {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  isSpeaking: boolean;
  isListening: boolean;
  lipSyncData?: number; // Value between 0 and 1 for mouth opening
}

const Character: React.FC<CharacterProps> = ({
  position = [0, -1, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  isSpeaking,
  isListening,
  lipSyncData = 0,
}) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/Ayla18.glb');
  const { actions, names } = useAnimations(animations, group);
  
  // References to specific bones for animation
  const headBone = useRef<THREE.Bone | null>(null);
  const jawBone = useRef<THREE.Bone | null>(null);
  const eyeLidBones = useRef<THREE.Bone[]>([]);
  const spineBone = useRef<THREE.Bone | null>(null);
  
  // Animation states
  const [blinking, setBlinking] = useState(false);
  const [smiling, setSmiling] = useState(true); // Default to smiling
  const [swaying, setSwaying] = useState(false);
  
  // Initialize character and find bones
  useEffect(() => {
    if (scene) {
      scene.traverse((object) => {
        // Find head bone
        if (object.name.toLowerCase().includes('head')) {
          headBone.current = object as THREE.Bone;
        }
        
        // Find jaw bone for lip sync
        if (object.name.toLowerCase().includes('jaw')) {
          jawBone.current = object as THREE.Bone;
        }
        
        // Find eyelid bones
        if (object.name.toLowerCase().includes('eyelid') || 
            object.name.toLowerCase().includes('eye_lid')) {
          eyeLidBones.current.push(object as THREE.Bone);
        }
        
        // Find spine bone for body movement
        if (object.name.toLowerCase().includes('spine')) {
          spineBone.current = object as THREE.Bone;
        }
      });
      
      // Start idle animation by default - specifically look for a neutral pose animation
      // that keeps hands at the sides
      const neutralAnimation = names.find(name => 
        name.toLowerCase().includes('neutral') || 
        name.toLowerCase().includes('t_pose') ||
        name.toLowerCase().includes('stand')
      );
      
      const idleAnimation = names.find(name => 
        name.toLowerCase().includes('idle') || 
        name.toLowerCase().includes('breathing')
      );
      
      // First try to use a neutral animation if available
      if (neutralAnimation && actions[neutralAnimation]) {
        const action = actions[neutralAnimation];
        if (action) {
          action.reset().fadeIn(0.5).play();
        }
      } 
      // Fall back to idle animation if neutral not available
      else if (idleAnimation && actions[idleAnimation]) {
        const action = actions[idleAnimation];
        if (action) {
          action.reset().fadeIn(0.5).play();
        }
      }
      
      console.log('Available animations:', names);
      
      // Force arms to sides position - Enhanced version with stronger constraints
      scene.traverse((object) => {
        if (object.name.toLowerCase().includes('arm') || 
            object.name.toLowerCase().includes('hand') ||
            object.name.toLowerCase().includes('shoulder') ||
            object.name.toLowerCase().includes('forearm') ||
            object.name.toLowerCase().includes('wrist')) {
          const bone = object as THREE.Bone;
          
          // Reset any rotation that might cause arms to be outstretched
          if (object.name.toLowerCase().includes('left')) {
            if (bone.rotation) {
              // Adjust left arm to be firmly at side
              bone.rotation.z = 0.2; // Stronger inward rotation
              bone.rotation.x = 0;
              bone.rotation.y = 0;
              
              // If this is the upper arm, position it closer to body
              if (object.name.toLowerCase().includes('upper')) {
                bone.rotation.z = 0.3; // Increased inward rotation
              }
              
              // If this is the forearm or hand, ensure it's pointing downward
              if (object.name.toLowerCase().includes('forearm') || 
                  object.name.toLowerCase().includes('hand') ||
                  object.name.toLowerCase().includes('wrist')) {
                bone.rotation.x = 0;
                bone.rotation.y = 0;
                bone.rotation.z = 0.1;
              }
            }
          } else if (object.name.toLowerCase().includes('right')) {
            if (bone.rotation) {
              // Adjust right arm to be firmly at side
              bone.rotation.z = -0.2; // Stronger inward rotation (negative for right side)
              bone.rotation.x = 0;
              bone.rotation.y = 0;
              
              // If this is the upper arm, position it closer to body
              if (object.name.toLowerCase().includes('upper')) {
                bone.rotation.z = -0.3; // Increased inward rotation
              }
              
              // If this is the forearm or hand, ensure it's pointing downward
              if (object.name.toLowerCase().includes('forearm') || 
                  object.name.toLowerCase().includes('hand') ||
                  object.name.toLowerCase().includes('wrist')) {
                bone.rotation.x = 0;
                bone.rotation.y = 0;
                bone.rotation.z = -0.1;
              }
            }
          }
        }
      });
      
      // Additional check to ensure hands are in correct position
      // This runs after a short delay to override any animation defaults
      setTimeout(() => {
        scene.traverse((object) => {
          if (object.name.toLowerCase().includes('arm') || 
              object.name.toLowerCase().includes('hand') ||
              object.name.toLowerCase().includes('shoulder') ||
              object.name.toLowerCase().includes('forearm') ||
              object.name.toLowerCase().includes('wrist')) {
            const bone = object as THREE.Bone;
            
            // Force hands to sides position with stronger constraints
            if (object.name.toLowerCase().includes('left')) {
              if (bone.rotation) {
                // Ensure left arm is at side
                if (object.name.toLowerCase().includes('upper')) {
                  bone.rotation.z = 0.3; // Stronger inward rotation
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                } else if (object.name.toLowerCase().includes('forearm') || 
                          object.name.toLowerCase().includes('lower')) {
                  bone.rotation.z = 0.1;
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                } else if (object.name.toLowerCase().includes('hand') || 
                          object.name.toLowerCase().includes('wrist')) {
                  bone.rotation.z = 0.1;
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                }
              }
            } else if (object.name.toLowerCase().includes('right')) {
              if (bone.rotation) {
                // Ensure right arm is at side
                if (object.name.toLowerCase().includes('upper')) {
                  bone.rotation.z = -0.3; // Stronger inward rotation
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                } else if (object.name.toLowerCase().includes('forearm') || 
                          object.name.toLowerCase().includes('lower')) {
                  bone.rotation.z = -0.1;
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                } else if (object.name.toLowerCase().includes('hand') || 
                          object.name.toLowerCase().includes('wrist')) {
                  bone.rotation.z = -0.1;
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                }
              }
            }
          }
        });
      }, 100);
      
      // Apply a third pass after a longer delay to ensure animations don't override our settings
      setTimeout(() => {
        scene.traverse((object) => {
          if (object.name.toLowerCase().includes('arm') || 
              object.name.toLowerCase().includes('hand') ||
              object.name.toLowerCase().includes('shoulder')) {
            const bone = object as THREE.Bone;
            
            // Force arms to sides with even stronger constraints
            if (object.name.toLowerCase().includes('left')) {
              if (bone.rotation) {
                if (object.name.toLowerCase().includes('upper')) {
                  bone.rotation.z = 0.3;
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                }
              }
            } else if (object.name.toLowerCase().includes('right')) {
              if (bone.rotation) {
                if (object.name.toLowerCase().includes('upper')) {
                  bone.rotation.z = -0.3;
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                }
              }
            }
          }
        });
      }, 500);
    }
  }, [scene, actions, names]);
  
  // Handle animations based on state
  useEffect(() => {
    // Find relevant animations
    const talkAnimation = names.find(name => name.toLowerCase().includes('talk'));
    const listenAnimation = names.find(name => name.toLowerCase().includes('listen'));
    const idleAnimation = names.find(name => 
      name.toLowerCase().includes('idle') || 
      name.toLowerCase().includes('breathing')
    );
    const smileAnimation = names.find(name => name.toLowerCase().includes('smile'));
    
    // Play appropriate animation based on state
    if (isSpeaking && talkAnimation && actions[talkAnimation]) {
      // Crossfade to talking animation
      const talkAction = actions[talkAnimation];
      if (talkAction) {
        talkAction.reset().fadeIn(0.5).play();
      }
      
      if (idleAnimation && actions[idleAnimation]) {
        const idleAction = actions[idleAnimation];
        if (idleAction) {
          idleAction.fadeOut(0.5);
        }
      }
      
      // Keep smiling while speaking
      setSmiling(true);
    } else if (isListening && listenAnimation && actions[listenAnimation]) {
      // Crossfade to listening animation
      const listenAction = actions[listenAnimation];
      if (listenAction) {
        listenAction.reset().fadeIn(0.5).play();
      }
      
      if (idleAnimation && actions[idleAnimation]) {
        const idleAction = actions[idleAnimation];
        if (idleAction) {
          idleAction.fadeOut(0.5);
        }
      }
      
      // Always smile when listening
      setSmiling(true);
    } else if (idleAnimation && actions[idleAnimation]) {
      // Return to idle animation
      const idleAction = actions[idleAnimation];
      if (idleAction) {
        idleAction.reset().fadeIn(0.5).play();
      }
      
      if (talkAnimation && actions[talkAnimation]) {
        const talkAction = actions[talkAnimation];
        if (talkAction) {
          talkAction.fadeOut(0.5);
        }
      }
      
      if (listenAnimation && actions[listenAnimation]) {
        const listenAction = actions[listenAnimation];
        if (listenAction) {
          listenAction.fadeOut(0.5);
        }
      }
      
      // Keep smiling in idle state too
      setSmiling(true);
    }
    
    // Play smile animation when smiling
    if (smiling && smileAnimation && actions[smileAnimation]) {
      const smileAction = actions[smileAnimation];
      if (smileAction) {
        smileAction.reset().fadeIn(0.2).play();
        // Keep the smile animation playing continuously
        smileAction.setLoop(THREE.LoopRepeat, Infinity);
      }
    }
    
    // Force arms to sides after any animation change
    if (scene) {
      setTimeout(() => {
        scene.traverse((object) => {
          if (object.name.toLowerCase().includes('arm') || 
              object.name.toLowerCase().includes('hand') ||
              object.name.toLowerCase().includes('shoulder')) {
            const bone = object as THREE.Bone;
            
            if (object.name.toLowerCase().includes('left')) {
              if (bone.rotation) {
                if (object.name.toLowerCase().includes('upper')) {
                  bone.rotation.z = 0.3;
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                }
              }
            } else if (object.name.toLowerCase().includes('right')) {
              if (bone.rotation) {
                if (object.name.toLowerCase().includes('upper')) {
                  bone.rotation.z = -0.3;
                  bone.rotation.x = 0;
                  bone.rotation.y = 0;
                }
              }
            }
          }
        });
      }, 100);
    }
  }, [isSpeaking, isListening, smiling, actions, names, scene]);
  
  // Trigger random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (!blinking && Math.random() < 0.3) {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 200);
      }
    }, 3000);
    
    return () => clearInterval(blinkInterval);
  }, [blinking]);
  
  // Trigger random swaying
  useEffect(() => {
    const swayInterval = setInterval(() => {
      if (!swaying && Math.random() < 0.2) {
        setSwaying(true);
        setTimeout(() => setSwaying(false), 2000);
      }
    }, 5000);
    
    return () => clearInterval(swayInterval);
  }, [swaying]);
  
  // Animation frame updates
  useFrame((_, delta) => {
    // Lip sync - adjust jaw bone based on lipSyncData
    if (jawBone.current && isSpeaking) {
      // Apply sinusoidal movement to make it more natural
      const jawRotation = Math.sin(Date.now() * 0.01) * 0.1 * lipSyncData;
      jawBone.current.rotation.x = Math.max(0, jawRotation);
    }
    
    // Eye blinking
    if (eyeLidBones.current.length > 0) {
      if (blinking) {
        eyeLidBones.current.forEach(bone => {
          if (bone) {
            bone.scale.y = 0.1; // Close eyes
          }
        });
      } else {
        eyeLidBones.current.forEach(bone => {
          if (bone) {
            bone.scale.y = 1.0; // Open eyes
          }
        });
      }
    }
    
    // Subtle head movement for more lifelike appearance
    if (headBone.current) {
      // Gentle swaying motion
      const time = Date.now() * 0.001;
      headBone.current.rotation.y = Math.sin(time * 0.5) * 0.05;
      headBone.current.rotation.x = Math.sin(time * 0.3) * 0.03;
      
      // More pronounced movement when listening
      if (isListening) {
        headBone.current.rotation.z = Math.sin(time * 0.7) * 0.02;
      }
    }
    
    // Body swaying when speaking or during special animation
    if (spineBone.current) {
      if (swaying || isSpeaking) {
        const time = Date.now() * 0.001;
        spineBone.current.rotation.y = Math.sin(time * 0.3) * 0.03;
        spineBone.current.position.x = Math.sin(time * 0.5) * 0.01;
      } else {
        // Reset to neutral position
        spineBone.current.rotation.y = 0;
        spineBone.current.position.x = 0;
      }
    }
    
    // Smiling expression - ensure it's always active
    if (smiling) {
      // If we have specific facial bones for smiling, we would animate them here
      // Since we're using animation clips, this is handled in the useEffect above
      
      // Force arms to sides in every frame to prevent animations from moving them
      if (scene) {
        scene.traverse((object) => {
          if ((object.name.toLowerCase().includes('arm') && object.name.toLowerCase().includes('upper')) || 
              object.name.toLowerCase().includes('shoulder')) {
            const bone = object as THREE.Bone;
            
            if (object.name.toLowerCase().includes('left')) {
              if (bone.rotation) {
                bone.rotation.z = 0.3;
                bone.rotation.x = 0;
                bone.rotation.y = 0;
              }
            } else if (object.name.toLowerCase().includes('right')) {
              if (bone.rotation) {
                bone.rotation.z = -0.3;
                bone.rotation.x = 0;
                bone.rotation.y = 0;
              }
            }
          }
        });
      }
    }
  });
  
  return (
    <group ref={group} position={position} scale={scale} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
};

export default Character;

// Preload the model
useGLTF.preload('/models/Ayla18.glb');
