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
      
      // Apply subtle arm position changes based on GLB analysis
      const adjustArmPositions = () => {
        console.log("Applying subtle arm position adjustments...");
        
        // Based on GLB analysis, we know the model has morph targets and bones
        // We'll use a more targeted approach to adjust only the upper arm bones
        
        // Find and adjust left upper arm
        scene.traverse((object) => {
          const name = object.name.toLowerCase();
          
          // Target only the upper arm bones, not the entire arm
          if ((name.includes('left') && name.includes('arm') && name.includes('upper')) ||
              (name.includes('l_') && name.includes('arm') && !name.includes('forearm'))) {
            
            console.log(`Adjusting left upper arm bone: ${object.name}`);
            const bone = object as THREE.Bone;
            
            // Apply a subtle rotation to bring the arm closer to the body
            // Using a smaller value (0.3) compared to our previous aggressive approach (0.8)
            bone.rotation.z = 0.3;
            
            console.log(`Set left upper arm rotation to: ${bone.rotation.z}`);
          }
        });
        
        // Find and adjust right upper arm
        scene.traverse((object) => {
          const name = object.name.toLowerCase();
          
          // Target only the upper arm bones, not the entire arm
          if ((name.includes('right') && name.includes('arm') && name.includes('upper')) ||
              (name.includes('r_') && name.includes('arm') && !name.includes('forearm'))) {
            
            console.log(`Adjusting right upper arm bone: ${object.name}`);
            const bone = object as THREE.Bone;
            
            // Apply a subtle rotation to bring the arm closer to the body
            // Using a smaller value (-0.3) compared to our previous aggressive approach (-0.8)
            bone.rotation.z = -0.3;
            
            console.log(`Set right upper arm rotation to: ${bone.rotation.z}`);
          }
        });
        
        setArmsInitialized(true);
      };
      
      // Apply the subtle arm adjustments
      adjustArmPositions();
      
      // Apply a second time after a short delay to ensure it takes effect
      setTimeout(adjustArmPositions, 500);
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
        // Find and adjust left upper arm
        scene.traverse((object) => {
          const name = object.name.toLowerCase();
          
          // Target only the upper arm bones, not the entire arm
          if ((name.includes('left') && name.includes('arm') && name.includes('upper')) ||
              (name.includes('l_') && name.includes('arm') && !name.includes('forearm'))) {
            
            const bone = object as THREE.Bone;
            bone.rotation.z = 0.3;
          }
        });
        
        // Find and adjust right upper arm
        scene.traverse((object) => {
          const name = object.name.toLowerCase();
          
          // Target only the upper arm bones, not the entire arm
          if ((name.includes('right') && name.includes('arm') && name.includes('upper')) ||
              (name.includes('r_') && name.includes('arm') && !name.includes('forearm'))) {
            
            const bone = object as THREE.Bone;
            bone.rotation.z = -0.3;
          }
        });
      }, 100);
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
    
    // Gently enforce arm positions in every frame
    if (armsInitialized) {
      // Find and adjust left upper arm
      scene.traverse((object) => {
        const name = object.name.toLowerCase();
        
        // Target only the upper arm bones, not the entire arm
        if ((name.includes('left') && name.includes('arm') && name.includes('upper')) ||
            (name.includes('l_') && name.includes('arm') && !name.includes('forearm'))) {
          
          const bone = object as THREE.Bone;
          // Gradually adjust the rotation to avoid sudden movements
          bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, 0.3, 0.1);
        }
      });
      
      // Find and adjust right upper arm
      scene.traverse((object) => {
        const name = object.name.toLowerCase();
        
        // Target only the upper arm bones, not the entire arm
        if ((name.includes('right') && name.includes('arm') && name.includes('upper')) ||
            (name.includes('r_') && name.includes('arm') && !name.includes('forearm'))) {
          
          const bone = object as THREE.Bone;
          // Gradually adjust the rotation to avoid sudden movements
          bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, -0.3, 0.1);
        }
      });
    }
    
    // Apply morph targets for smile if available
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && 
          object.morphTargetDictionary && 
          object.morphTargetInfluences) {
        
        // Check for smile-related morph targets based on GLB analysis
        const smileTargets = [
          'Mouth_Smile', 'Mouth_Smile_L', 'Mouth_Smile_R',
          'A38_Mouth_Smile_Left', 'A39_Mouth_Smile_Right'
        ];
        
        smileTargets.forEach(targetName => {
          const idx = object.morphTargetDictionary[targetName];
          if (idx !== undefined && smiling) {
            // Apply a subtle smile influence (0.3) instead of maximum (1.0)
            object.morphTargetInfluences[idx] = 0.3;
          }
        });
      }
    });
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
