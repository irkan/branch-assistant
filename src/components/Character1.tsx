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
  const { scene, animations } = useGLTF('/models/Ayla20.glb');
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
      
      // Log all animations for debugging
      console.log('All animations:', animations);
      console.log('Animation names:', names);
      console.log('Available actions:', actions);
      
      // Try to find and play animation
      if (animations && animations.length > 0) {
        console.log('Found animations:', animations.length);
        
        // Create a mixer and get the first animation
        const mixer = new THREE.AnimationMixer(scene);
        const mainAnimation = animations[0]; // Armature|5489117044992_TempMotion
        const action = mixer.clipAction(mainAnimation);
        
        // Configure the animation
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
        
        // Set the animation to frame 150
        action.time = (150 / 30); // Assuming 30fps animation
        action.play();
        
        // Update mixer once to apply frame 150
        mixer.update(0);
        
        // Stop at frame 150
        action.paused = true;
        
        // Update the skeleton
        scene.traverse((object: THREE.Object3D) => {
          if (object instanceof THREE.Bone) {
            object.updateMatrixWorld(true);
          }
        });
      }
      
      // Start idle animation by default
      const neutralAnimation = names.find(name => 
        name.toLowerCase().includes('neutral') || 
        name.toLowerCase().includes('t_pose') ||
        name.toLowerCase().includes('stand') ||
        name.toLowerCase().includes('idle')
      );
      
      if (neutralAnimation && actions[neutralAnimation]) {
        console.log('Playing neutral animation:', neutralAnimation);
        const action = actions[neutralAnimation];
        if (action) {
          action.reset().fadeIn(0.5).play();
        }
      } else {
        console.log('No neutral animation found. Available animations:', names);
      }
      
      // Force arms to sides position if needed
      scene.traverse((object) => {
        if (object.name.toLowerCase().includes('arm') || 
            object.name.toLowerCase().includes('hand') ||
            object.name.toLowerCase().includes('shoulder')) {
          const bone = object as THREE.Bone;
          
          // Reset any rotation that might cause arms to be outstretched
          if (object.name.toLowerCase().includes('left')) {
            if (bone.rotation) {
              // Adjust left arm to be at side
              bone.rotation.z = 0.1; // Very slight inward rotation
              bone.rotation.x = 0;
              bone.rotation.y = 0;
              
              // If this is the upper arm, position it closer to body
              if (object.name.toLowerCase().includes('upper')) {
                bone.rotation.z = 0.05;
              }
            }
          } else if (object.name.toLowerCase().includes('right')) {
            if (bone.rotation) {
              // Adjust right arm to be at side
              bone.rotation.z = -0.1; // Very slight inward rotation (negative for right side)
              bone.rotation.x = 0;
              bone.rotation.y = 0;
              
              // If this is the upper arm, position it closer to body
              if (object.name.toLowerCase().includes('upper')) {
                bone.rotation.z = -0.05;
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
              object.name.toLowerCase().includes('shoulder')) {
            const bone = object as THREE.Bone;
            
            // Force hands to sides position
            if (object.name.toLowerCase().includes('left')) {
              if (bone.rotation) {
                bone.rotation.z = Math.min(bone.rotation.z, 0.1);
                bone.rotation.x = 0;
              }
            } else if (object.name.toLowerCase().includes('right')) {
              if (bone.rotation) {
                bone.rotation.z = Math.max(bone.rotation.z, -0.1);
                bone.rotation.x = 0;
              }
            }
          }
        });
      }, 100);
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
      
      // When listening, occasionally smile
      if (isListening && !smiling && Math.random() < 0.01) {
        setSmiling(true);
        setTimeout(() => setSmiling(false), 2000);
      }
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
    }
    
    // Play smile animation when smiling
    if (smiling && smileAnimation && actions[smileAnimation]) {
      const smileAction = actions[smileAnimation];
      if (smileAction) {
        smileAction.reset().fadeIn(0.2).play();
        setTimeout(() => {
          if (smileAction) {
            smileAction.fadeOut(0.2);
          }
        }, 1800);
      }
    }
  }, [isSpeaking, isListening, smiling, actions, names]);
  
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
    
    // Smiling expression
    if (smiling && isListening) {
      // If we have specific facial bones for smiling, we would animate them here
      // Since we're using animation clips, this is handled in the useEffect above
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
useGLTF.preload('/models/Ayla20.glb');
