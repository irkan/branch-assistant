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
  const leftArmBones = useRef<THREE.Bone[]>([]);
  const rightArmBones = useRef<THREE.Bone[]>([]);
  
  // Animation states
  const [blinking, setBlinking] = useState(false);
  const [smiling, setSmiling] = useState(true); // Default to smiling
  const [swaying, setSwaying] = useState(false);
  const [armsInitialized, setArmsInitialized] = useState(false);
  
  // Initialize character and find bones
  useEffect(() => {
    if (scene) {
      console.log("Scene loaded, finding bones...");
      
      // Create a new pose for the character
      const createDefaultPose = () => {
        // Clone the scene to avoid modifying the original
        const clonedScene = scene.clone();
        
        // Apply default pose to the cloned scene
        clonedScene.traverse((object) => {
          // Reset all rotations to default
          if (object instanceof THREE.Bone) {
            object.rotation.set(0, 0, 0);
          }
        });
        
        return clonedScene;
      };
      
      // Store the default pose
      const defaultPose = createDefaultPose();
      
      // Log all object names for debugging
      scene.traverse((object) => {
        console.log("Object name:", object.name);
      });
      
      // Find all relevant bones
      scene.traverse((object) => {
        // Find head bone
        if (object.name.toLowerCase().includes('head')) {
          headBone.current = object as THREE.Bone;
          console.log("Found head bone:", object.name);
        }
        
        // Find jaw bone for lip sync
        if (object.name.toLowerCase().includes('jaw')) {
          jawBone.current = object as THREE.Bone;
          console.log("Found jaw bone:", object.name);
        }
        
        // Find eyelid bones
        if (object.name.toLowerCase().includes('eyelid') || 
            object.name.toLowerCase().includes('eye_lid')) {
          eyeLidBones.current.push(object as THREE.Bone);
          console.log("Found eyelid bone:", object.name);
        }
        
        // Find spine bone for body movement
        if (object.name.toLowerCase().includes('spine')) {
          spineBone.current = object as THREE.Bone;
          console.log("Found spine bone:", object.name);
        }
        
        // Find left arm bones
        if ((object.name.toLowerCase().includes('arm') || 
             object.name.toLowerCase().includes('hand') ||
             object.name.toLowerCase().includes('shoulder') ||
             object.name.toLowerCase().includes('forearm') ||
             object.name.toLowerCase().includes('wrist') ||
             object.name.toLowerCase().includes('elbow')) && 
            object.name.toLowerCase().includes('left')) {
          leftArmBones.current.push(object as THREE.Bone);
          console.log("Found left arm bone:", object.name);
        }
        
        // Find right arm bones
        if ((object.name.toLowerCase().includes('arm') || 
             object.name.toLowerCase().includes('hand') ||
             object.name.toLowerCase().includes('shoulder') ||
             object.name.toLowerCase().includes('forearm') ||
             object.name.toLowerCase().includes('wrist') ||
             object.name.toLowerCase().includes('elbow')) && 
            object.name.toLowerCase().includes('right')) {
          rightArmBones.current.push(object as THREE.Bone);
          console.log("Found right arm bone:", object.name);
        }
      });
      
      // Disable all animations initially
      if (names.length > 0) {
        console.log("Available animations:", names);
        names.forEach(name => {
          // Fix TypeScript error: Check if actions[name] exists and is not null before calling stop()
          const action = actions[name];
          if (action) {
            action.stop();
          }
        });
      }
      
      // RADICAL APPROACH: Directly modify the model's pose
      // This is a more aggressive approach that directly modifies the model's pose
      
      // 1. Force arms down by directly setting quaternions
      const setArmsDown = () => {
        console.log("RADICAL APPROACH: Setting arms down by force...");
        
        // Try multiple bone naming patterns
        const leftArmPatterns = [
          "mixamorig:LeftArm", "LeftArm", "Left_Arm", "left_arm", 
          "L_arm", "l_arm", "LeftShoulder", "Left_Shoulder"
        ];
        
        const rightArmPatterns = [
          "mixamorig:RightArm", "RightArm", "Right_Arm", "right_arm", 
          "R_arm", "r_arm", "RightShoulder", "Right_Shoulder"
        ];
        
        // Find and modify left arm
        let leftArmFound = false;
        scene.traverse((object) => {
          if (!leftArmFound && leftArmPatterns.some(pattern => object.name.includes(pattern))) {
            console.log(`Found left arm bone: ${object.name}`);
            const bone = object as THREE.Bone;
            
            // Set rotation to point down
            bone.rotation.set(0, 0, 0.8);
            
            // Also try quaternion approach
            const downQuaternion = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(0, 0, 0.8)
            );
            bone.quaternion.copy(downQuaternion);
            
            // Mark as found
            leftArmFound = true;
            console.log(`Set left arm bone ${object.name} to down position`);
          }
        });
        
        // Find and modify right arm
        let rightArmFound = false;
        scene.traverse((object) => {
          if (!rightArmFound && rightArmPatterns.some(pattern => object.name.includes(pattern))) {
            console.log(`Found right arm bone: ${object.name}`);
            const bone = object as THREE.Bone;
            
            // Set rotation to point down
            bone.rotation.set(0, 0, -0.8);
            
            // Also try quaternion approach
            const downQuaternion = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(0, 0, -0.8)
            );
            bone.quaternion.copy(downQuaternion);
            
            // Mark as found
            rightArmFound = true;
            console.log(`Set right arm bone ${object.name} to down position`);
          }
        });
        
        // If specific bones weren't found, try a more general approach
        if (!leftArmFound || !rightArmFound) {
          console.log("Specific arm bones not found, trying general approach...");
          
          scene.traverse((object) => {
            const name = object.name.toLowerCase();
            
            // Left arm bones
            if (name.includes('left') && (name.includes('arm') || name.includes('shoulder'))) {
              const bone = object as THREE.Bone;
              bone.rotation.set(0, 0, 0.8);
              console.log(`Set general left arm bone ${object.name} to down position`);
            }
            
            // Right arm bones
            if (name.includes('right') && (name.includes('arm') || name.includes('shoulder'))) {
              const bone = object as THREE.Bone;
              bone.rotation.set(0, 0, -0.8);
              console.log(`Set general right arm bone ${object.name} to down position`);
            }
          });
        }
      };
      
      // 2. Force smile by directly setting face morphs or bones
      const setSmile = () => {
        console.log("RADICAL APPROACH: Setting smile by force...");
        
        // Try to find smile morph targets
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh && object.morphTargetDictionary) {
            const morphTargets = object.morphTargetDictionary;
            
            // Check for smile-related morph targets
            const smileTargets = Object.keys(morphTargets).filter(key => 
              key.toLowerCase().includes('smile') || 
              key.toLowerCase().includes('happy') ||
              key.toLowerCase().includes('joy')
            );
            
            if (smileTargets.length > 0) {
              console.log(`Found smile morph targets: ${smileTargets.join(', ')}`);
              
              // Set all smile-related morph targets to maximum
              smileTargets.forEach(target => {
                const index = morphTargets[target];
                if (object.morphTargetInfluences && index < object.morphTargetInfluences.length) {
                  object.morphTargetInfluences[index] = 1.0;
                  console.log(`Set morph target ${target} to 1.0`);
                }
              });
            }
          }
        });
        
        // Try to find smile-related bones
        const smileBonePatterns = [
          "smile", "mouth", "lip", "jaw", "cheek"
        ];
        
        scene.traverse((object) => {
          const name = object.name.toLowerCase();
          if (object instanceof THREE.Bone && 
              smileBonePatterns.some(pattern => name.includes(pattern))) {
            console.log(`Found potential smile bone: ${object.name}`);
            
            // Apply smile rotation based on bone name
            if (name.includes('jaw')) {
              object.rotation.set(0.1, 0, 0); // Slight jaw opening
            } else if (name.includes('lip') && name.includes('corner')) {
              if (name.includes('left')) {
                object.rotation.set(0, 0, 0.2); // Left lip corner up
              } else if (name.includes('right')) {
                object.rotation.set(0, 0, -0.2); // Right lip corner up
              }
            } else if (name.includes('cheek')) {
              object.position.y += 0.02; // Raise cheeks slightly
            }
            
            console.log(`Applied smile pose to ${object.name}`);
          }
        });
      };
      
      // Apply radical changes
      setArmsDown();
      setSmile();
      
      // Apply changes again after a delay to ensure they take effect
      setTimeout(() => {
        setArmsDown();
        setSmile();
        console.log("Reapplied radical pose changes after delay");
      }, 500);
      
      // Set flag to indicate arms are initialized
      setArmsInitialized(true);
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
    
    // RADICAL APPROACH: Reapply arm and smile settings after any animation change
    if (scene && armsInitialized) {
      // Force arms down again
      const reapplyArmsDown = () => {
        console.log("Reapplying arms down after animation change...");
        
        // Left arm
        scene.traverse((object) => {
          const name = object.name.toLowerCase();
          if (object instanceof THREE.Bone && 
              name.includes('left') && 
              (name.includes('arm') || name.includes('shoulder'))) {
            object.rotation.set(0, 0, 0.8);
          }
        });
        
        // Right arm
        scene.traverse((object) => {
          const name = object.name.toLowerCase();
          if (object instanceof THREE.Bone && 
              name.includes('right') && 
              (name.includes('arm') || name.includes('shoulder'))) {
            object.rotation.set(0, 0, -0.8);
          }
        });
      };
      
      // Reapply after a short delay to let animation start
      setTimeout(reapplyArmsDown, 100);
      // And again after a longer delay to ensure it sticks
      setTimeout(reapplyArmsDown, 500);
    }
  }, [isSpeaking, isListening, smiling, actions, names, armsInitialized, scene]);
  
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
  
  // Animation frame updates - MOST IMPORTANT PART FOR ENFORCING POSE
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
    
    // RADICAL APPROACH: Force arm positions in EVERY frame
    // This is the most aggressive approach - it overrides any animation
    if (scene) {
      // Force left arm down
      scene.traverse((object) => {
        const name = object.name.toLowerCase();
        if (object instanceof THREE.Bone && 
            name.includes('left') && 
            (name.includes('arm') || name.includes('shoulder'))) {
          // Force rotation to point down
          object.rotation.set(0, 0, 0.8);
        }
      });
      
      // Force right arm down
      scene.traverse((object) => {
        const name = object.name.toLowerCase();
        if (object instanceof THREE.Bone && 
            name.includes('right') && 
            (name.includes('arm') || name.includes('shoulder'))) {
          // Force rotation to point down
          object.rotation.set(0, 0, -0.8);
        }
      });
      
      // Force smile-related bones
      scene.traverse((object) => {
        const name = object.name.toLowerCase();
        if (object instanceof THREE.Bone) {
          // Jaw for slight smile opening
          if (name.includes('jaw')) {
            object.rotation.x = Math.max(object.rotation.x, 0.05);
          }
          
          // Lip corners for smile
          if (name.includes('lip') && name.includes('corner')) {
            if (name.includes('left')) {
              object.rotation.z = Math.max(object.rotation.z, 0.2);
            } else if (name.includes('right')) {
              object.rotation.z = Math.min(object.rotation.z, -0.2);
            }
          }
        }
        
        // Force smile morph targets if available
        if (object instanceof THREE.Mesh && object.morphTargetDictionary) {
          const morphTargets = object.morphTargetDictionary;
          
          // Set smile-related morph targets
          Object.keys(morphTargets).forEach(key => {
            if (key.toLowerCase().includes('smile') || 
                key.toLowerCase().includes('happy') ||
                key.toLowerCase().includes('joy')) {
              const index = morphTargets[key];
              if (object.morphTargetInfluences && index < object.morphTargetInfluences.length) {
                object.morphTargetInfluences[index] = 1.0;
              }
            }
          });
        }
      });
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
