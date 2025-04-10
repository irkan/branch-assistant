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
      
      // Create a custom pose for the character with arms at sides
      const initializeArmPositions = () => {
        console.log("Initializing arm positions...");
        
        // Reset all arm bones to default position
        [...leftArmBones.current, ...rightArmBones.current].forEach(bone => {
          if (bone && bone.rotation) {
            bone.rotation.set(0, 0, 0);
          }
        });
        
        // Apply specific rotations to position arms at sides
        leftArmBones.current.forEach(bone => {
          if (bone) {
            const boneName = bone.name.toLowerCase();
            
            // Upper arm
            if (boneName.includes('upper') || boneName.includes('shoulder')) {
              // Position left upper arm down at side
              bone.rotation.z = 0.5; // Rotate inward toward body
              bone.rotation.x = 0.1; // Slight forward rotation
              bone.rotation.y = 0;
              console.log("Set left upper arm position:", bone.name);
            }
            
            // Lower arm/forearm
            if (boneName.includes('lower') || boneName.includes('forearm') || boneName.includes('elbow')) {
              // Position left forearm naturally
              bone.rotation.z = 0.1;
              bone.rotation.x = 0.1;
              bone.rotation.y = 0;
              console.log("Set left forearm position:", bone.name);
            }
            
            // Hand/wrist
            if (boneName.includes('hand') || boneName.includes('wrist')) {
              // Position left hand naturally
              bone.rotation.z = 0;
              bone.rotation.x = 0;
              bone.rotation.y = 0;
              console.log("Set left hand position:", bone.name);
            }
          }
        });
        
        rightArmBones.current.forEach(bone => {
          if (bone) {
            const boneName = bone.name.toLowerCase();
            
            // Upper arm
            if (boneName.includes('upper') || boneName.includes('shoulder')) {
              // Position right upper arm down at side
              bone.rotation.z = -0.5; // Rotate inward toward body (negative for right side)
              bone.rotation.x = 0.1; // Slight forward rotation
              bone.rotation.y = 0;
              console.log("Set right upper arm position:", bone.name);
            }
            
            // Lower arm/forearm
            if (boneName.includes('lower') || boneName.includes('forearm') || boneName.includes('elbow')) {
              // Position right forearm naturally
              bone.rotation.z = -0.1;
              bone.rotation.x = 0.1;
              bone.rotation.y = 0;
              console.log("Set right forearm position:", bone.name);
            }
            
            // Hand/wrist
            if (boneName.includes('hand') || boneName.includes('wrist')) {
              // Position right hand naturally
              bone.rotation.z = 0;
              bone.rotation.x = 0;
              bone.rotation.y = 0;
              console.log("Set right hand position:", bone.name);
            }
          }
        });
        
        setArmsInitialized(true);
        console.log("Arm positions initialized");
      };
      
      // Initialize arm positions
      initializeArmPositions();
      
      // Apply a more aggressive approach to force arms down
      setTimeout(() => {
        console.log("Applying forced arm positions...");
        
        // Try to find specific bones by exact names that might be in the model
        scene.traverse((object) => {
          // Common bone naming patterns in 3D models
          const exactLeftArmBones = [
            "LeftArm", "LeftForeArm", "LeftHand", "LeftShoulder",
            "mixamorig:LeftArm", "mixamorig:LeftForeArm", "mixamorig:LeftHand", "mixamorig:LeftShoulder",
            "Left_Arm", "Left_ForeArm", "Left_Hand", "Left_Shoulder"
          ];
          
          const exactRightArmBones = [
            "RightArm", "RightForeArm", "RightHand", "RightShoulder",
            "mixamorig:RightArm", "mixamorig:RightForeArm", "mixamorig:RightHand", "mixamorig:RightShoulder",
            "Right_Arm", "Right_ForeArm", "Right_Hand", "Right_Shoulder"
          ];
          
          // Force left arm bones
          if (exactLeftArmBones.includes(object.name)) {
            const bone = object as THREE.Bone;
            if (bone.name.includes("Shoulder") || bone.name.includes("Arm") && !bone.name.includes("Fore")) {
              bone.rotation.z = 0.5;
              bone.rotation.x = 0.1;
              bone.rotation.y = 0;
              console.log("Forced left arm bone position:", bone.name);
            }
          }
          
          // Force right arm bones
          if (exactRightArmBones.includes(object.name)) {
            const bone = object as THREE.Bone;
            if (bone.name.includes("Shoulder") || bone.name.includes("Arm") && !bone.name.includes("Fore")) {
              bone.rotation.z = -0.5;
              bone.rotation.x = 0.1;
              bone.rotation.y = 0;
              console.log("Forced right arm bone position:", bone.name);
            }
          }
        });
        
        // Try to directly modify the mesh vertices if bone approach isn't working
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh && object.geometry) {
            const geometry = object.geometry;
            if (geometry.attributes && geometry.attributes.position) {
              console.log("Found mesh with geometry:", object.name);
              // This is a more extreme approach that would modify the actual mesh
              // Only use if bone manipulation fails completely
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
    
    // Reapply arm positions after any animation change
    if (armsInitialized) {
      setTimeout(() => {
        console.log("Reapplying arm positions after animation change...");
        
        // Left arm
        leftArmBones.current.forEach(bone => {
          if (bone) {
            const boneName = bone.name.toLowerCase();
            
            // Upper arm
            if (boneName.includes('upper') || boneName.includes('shoulder')) {
              bone.rotation.z = 0.5;
              bone.rotation.x = 0.1;
              bone.rotation.y = 0;
            }
            
            // Lower arm/forearm
            if (boneName.includes('lower') || boneName.includes('forearm') || boneName.includes('elbow')) {
              bone.rotation.z = 0.1;
              bone.rotation.x = 0.1;
              bone.rotation.y = 0;
            }
          }
        });
        
        // Right arm
        rightArmBones.current.forEach(bone => {
          if (bone) {
            const boneName = bone.name.toLowerCase();
            
            // Upper arm
            if (boneName.includes('upper') || boneName.includes('shoulder')) {
              bone.rotation.z = -0.5;
              bone.rotation.x = 0.1;
              bone.rotation.y = 0;
            }
            
            // Lower arm/forearm
            if (boneName.includes('lower') || boneName.includes('forearm') || boneName.includes('elbow')) {
              bone.rotation.z = -0.1;
              bone.rotation.x = 0.1;
              bone.rotation.y = 0;
            }
          }
        });
      }, 100);
    }
  }, [isSpeaking, isListening, smiling, actions, names, armsInitialized]);
  
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
    
    // Continuously enforce arm positions in every frame
    if (armsInitialized) {
      // Left arm
      leftArmBones.current.forEach(bone => {
        if (bone) {
          const boneName = bone.name.toLowerCase();
          
          // Upper arm
          if (boneName.includes('upper') || boneName.includes('shoulder')) {
            bone.rotation.z = 0.5;
            bone.rotation.x = 0.1;
            bone.rotation.y = 0;
          }
          
          // Lower arm/forearm
          if (boneName.includes('lower') || boneName.includes('forearm') || boneName.includes('elbow')) {
            bone.rotation.z = 0.1;
            bone.rotation.x = 0.1;
            bone.rotation.y = 0;
          }
        }
      });
      
      // Right arm
      rightArmBones.current.forEach(bone => {
        if (bone) {
          const boneName = bone.name.toLowerCase();
          
          // Upper arm
          if (boneName.includes('upper') || boneName.includes('shoulder')) {
            bone.rotation.z = -0.5;
            bone.rotation.x = 0.1;
            bone.rotation.y = 0;
          }
          
          // Lower arm/forearm
          if (boneName.includes('lower') || boneName.includes('forearm') || boneName.includes('elbow')) {
            bone.rotation.z = -0.1;
            bone.rotation.x = 0.1;
            bone.rotation.y = 0;
          }
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
