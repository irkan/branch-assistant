/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 public/models/ayla/Ayla.glb -o src/components/Character.tsx -r public 
*/

import * as THREE from 'three'
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useGraph, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, useFBX } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'
import { MeshStandardMaterial, Vector3 } from 'three'

type ActionName = 'Armature|Default'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    Bang: THREE.SkinnedMesh
    Bun: THREE.SkinnedMesh
    CC_Base_Teeth_1: THREE.SkinnedMesh
    CC_Base_Teeth_2: THREE.SkinnedMesh
    Hair_Base_1: THREE.SkinnedMesh
    Hair_Base_2: THREE.SkinnedMesh
    High_Heels: THREE.SkinnedMesh
    Knee_length_skirt: THREE.SkinnedMesh
    Real_Hair: THREE.SkinnedMesh
    Rolled_sleeves_shirt: THREE.SkinnedMesh
    Underwear_Bottoms: THREE.SkinnedMesh
    CC_Base_Body_1: THREE.SkinnedMesh
    CC_Base_Body_2: THREE.SkinnedMesh
    CC_Base_Body_3: THREE.SkinnedMesh
    CC_Base_Body_4: THREE.SkinnedMesh
    CC_Base_Body_5: THREE.SkinnedMesh
    CC_Base_Body_6: THREE.SkinnedMesh
    CC_Base_Eye_1: THREE.SkinnedMesh
    CC_Base_Eye_2: THREE.SkinnedMesh
    CC_Base_Eye_3: THREE.SkinnedMesh
    CC_Base_Eye_4: THREE.SkinnedMesh
    CC_Base_EyeOcclusion_1: THREE.SkinnedMesh
    CC_Base_EyeOcclusion_2: THREE.SkinnedMesh
    CC_Base_TearLine_1: THREE.SkinnedMesh
    CC_Base_TearLine_2: THREE.SkinnedMesh
    CC_Base_Tongue: THREE.SkinnedMesh
    Female_Angled_1: THREE.SkinnedMesh
    Female_Angled_2: THREE.SkinnedMesh
    CC_Base_BoneRoot: THREE.Bone
  }
  materials: {
    ['Hair_Transparency.003']: THREE.MeshStandardMaterial
    ['Hair_Transparency.001']: THREE.MeshStandardMaterial
    Std_Upper_Teeth: THREE.MeshStandardMaterial
    Std_Lower_Teeth: THREE.MeshStandardMaterial
    Hair_Transparency: THREE.MeshStandardMaterial
    Scalp_Transparency: THREE.MeshStandardMaterial
    High_Heels: THREE.MeshStandardMaterial
    Knee_length_skirt: THREE.MeshStandardMaterial
    ['Hair_Transparency.002']: THREE.MeshStandardMaterial
    Rolled_sleeves_shirt: THREE.MeshStandardMaterial
    Underwear_Bottoms: THREE.MeshStandardMaterial
    Std_Skin_Head: THREE.MeshStandardMaterial
    Std_Skin_Body: THREE.MeshStandardMaterial
    Std_Skin_Arm: THREE.MeshStandardMaterial
    Std_Skin_Leg: THREE.MeshStandardMaterial
    Std_Nails: THREE.MeshStandardMaterial
    Std_Eyelash: THREE.MeshStandardMaterial
    Std_Eye_R: THREE.MeshStandardMaterial
    Std_Cornea_R: THREE.MeshStandardMaterial
    Std_Eye_L: THREE.MeshStandardMaterial
    Std_Cornea_L: THREE.MeshStandardMaterial
    Std_Eye_Occlusion_R: THREE.MeshStandardMaterial
    Std_Eye_Occlusion_L: THREE.MeshStandardMaterial
    Std_Tearline_R: THREE.MeshStandardMaterial
    Std_Tearline_L: THREE.MeshStandardMaterial
    Std_Tongue: THREE.MeshStandardMaterial
    Female_Angled_Transparency: THREE.MeshStandardMaterial
    Female_Angled_Base_Transparency: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

// Character props
type CharacterProps = {
  isSpeaking?: boolean;
  isListening?: boolean;
  lipSyncData?: number;
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  detectedFace?: { x: number; y: number };
} & React.JSX.IntrinsicElements['group'];

export function Character(props: CharacterProps) {
  const group = useRef<THREE.Group>(null)
  
  // Fix GLTF loading
  const { scene, animations } = useGLTF('/models/ayla/Ayla.glb')
  
  // Create safe clone
  const clone = React.useMemo(() => {
    try {
      return SkeletonUtils.clone(scene);
    } catch (error) {
      console.error('Error cloning scene:', error);
      return scene; // Return original scene as fallback
    }
  }, [scene]);
  
  // Safe graph extraction with proper type handling
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult
  
  // Add effect to log when character is mounted - remove or make less noisy
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Character component mounted');
    }
    return () => {
      // No need to log unmounting
    };
  }, []);
  
  // Log when group is ready - remove or make less noisy
  useEffect(() => {
    // Only log if there's an issue
    if (!group.current && process.env.NODE_ENV === 'development') {
      console.debug('Character group reference is null');
    }
  }, [group.current]);
  
  // Load FBX animations
  const standAnimation = useFBX('/models/ayla/Ayla_Stand_Motion.Fbx');
  standAnimation.animations[0].name = 'Stand';
  
  // Load the talk motion animations
  const talkAnimation = useFBX('/models/ayla/Ayla_Talk_Motion.Fbx')
  const talkAnimation1 = useFBX('/models/ayla/Ayla_Talk_Motion1.Fbx')
  
  // Rename the animations for easier reference
  talkAnimation.animations[0].name = 'Talk'
  talkAnimation1.animations[0].name = 'Talk1'
  
  // Separate mixer for better control
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  
  // Create a proper mixer that targets the armature specifically
  useEffect(() => {
    if (!group.current || !clone) return;
    
    // Simplified logging
    if (process.env.NODE_ENV === 'development') {
      console.debug('Setting up character animation');
    }

    // Find all bones in the model to better understand the skeleton
    let armature: THREE.Object3D | null = null;
    let skeleton: THREE.Skeleton | null = null;
    
    // Reduce excessive logging - only log findings, not the entire traversal
    clone.traverse((obj) => {
      if (obj.name === 'Armature' || obj.name.includes('Armature')) {
        armature = obj;
      }
      // Use type assertion for SkinnedMesh
      if (obj.type === 'SkinnedMesh') {
        const skinnedMesh = obj as THREE.SkinnedMesh;
        if (skinnedMesh.skeleton && !skeleton) {
          skeleton = skinnedMesh.skeleton;
        }
      }
    });
    
    // Log only important findings
    if (process.env.NODE_ENV === 'development' && !armature) {
      console.warn('No Armature found in model');
    }
    
    // Create a mixer
    const mixer = new THREE.AnimationMixer(clone);
    mixerRef.current = mixer;
    
    // Prepare the stand animation
    const standAnim = standAnimation.animations[0];
    
    // Just play the stand animation directly without modifications
    const standAction = mixer.clipAction(standAnim);
    standAction.play();
    standAnimRef.current = standAction;
    
    return () => {
      mixer.stopAllAction();
    };
  }, [clone, standAnimation.animations]);
  
  // Animation control state
  const [currentAnimation, setCurrentAnimation] = useState('Stand')
  const prevAnimationRef = useRef('Stand')
  
  // Switch between animations based on speaking/listening state
  useEffect(() => {
    if (!mixerRef.current || !standAnimRef.current) return
    
    const mixer = mixerRef.current
    const standAction = standAnimRef.current
    
    if (props.isSpeaking) {
      // Switch to talk animation
      const now = Date.now()
      
      // Choose which talk animation to use
      const talkClip = Math.random() > 0.5 ? 
        talkAnimation.animations[0] : 
        talkAnimation1.animations[0]
      
      // Create or get existing action
      let talkAction = mixer.existingAction(talkClip)
      
      if (!talkAction) {
        talkAction = mixer.clipAction(talkClip)
        talkAction.loop = THREE.LoopRepeat
        talkAction.clampWhenFinished = false
      }
      
      // Crossfade from stand to talk
      standAction.fadeOut(0.5)
      talkAction.reset().fadeIn(0.5).play()
      
      // Update current animation
      const clipName = talkClip.name
      setCurrentAnimation(clipName)
      prevAnimationRef.current = clipName
      
      console.log(`Switched to ${clipName} animation`)
    } else if (prevAnimationRef.current !== 'Stand') {
      // Switch back to stand animation if we weren't already in stand
      standAction.reset().fadeIn(0.5).play()
      
      // Stop all other animations
      mixer.existingAction(talkAnimation.animations[0])?.fadeOut(0.5)
      mixer.existingAction(talkAnimation1.animations[0])?.fadeOut(0.5)
      
      // Update current animation
      setCurrentAnimation('Stand')
      prevAnimationRef.current = 'Stand'
      
      console.log('Switched back to Stand animation')
    }
  }, [props.isSpeaking, talkAnimation.animations, talkAnimation1.animations])
  
  // Debug animation state changes
  useEffect(() => {
    console.log(`Animation changed to: ${currentAnimation}`)
  }, [currentAnimation])
  
  // Head reference for morphing
  const headMeshRef = useRef<THREE.SkinnedMesh>(null)

  // Log available morph targets on mount
  useEffect(() => {
    if (nodes.CC_Base_Body_1.morphTargetDictionary) {
      console.log('Available morph targets:', Object.keys(nodes.CC_Base_Body_1.morphTargetDictionary))
    }
  }, [nodes])
  
  // Define phoneme to viseme mapping
  const phonemeToViseme: Record<string, string> = {
    'A': 'Mouth_Wide',     // "a" sound
    'B': 'Mouth_Round',    // "o" sound
    'C': 'Mouth_Narrow',   // "i" sound
    'D': 'Mouth_Open',     // General mouth opening
    'E': 'Jaw_Open',       // Jaw opening
    'F': 'Mouth_Smile',    // Smile
    'G': 'Eyes_Blink',     // Eye blink
    'H': 'Eyes_Up_Down',   // Eye up/down movement
    'I': 'Eyes_Left_Right' // Eye left/right movement
  }
  
  // Time reference for animations
  const timeRef = useRef(0)
  
  // References for animation control
  const standAnimRef = useRef<THREE.AnimationAction | null>(null)
  const lastTalkAnimChangeRef = useRef(Date.now())
  
  // Eye tracking state
  const lookAt = useRef(new Vector3(0, 0, 1))
  const targetLookAt = useRef(new Vector3(0, 0, 1))
  const eyeLookSpeed = 0.05
  const lastBlinkTime = useRef(Date.now())
  const blinkInterval = useRef(Math.random() * 2000 + 3000) // Random blink interval between 3-5 seconds
  
  // Damping for more natural eye movement
  const dampingFactor = 0.92
  const previousVelocity = useRef(new Vector3(0, 0, 0))
  const maxEyeMovementSpeed = 0.1
  
  // Implement eye tracking functionality
  useEffect(() => {
    // Set initial random eye target
    targetLookAt.current.set(
      0, // Start with centered eyes
      0.05, // Slightly above center
      1
    )
  }, [])
  
  // Handle periodic random eye movement when no face is detected
  useFrame((state, delta) => {
    // Update timeRef for all animations
    timeRef.current += delta
    
    // Update mixer on each frame
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }
    
    // If no face is detected, do random eye movements every 2-4 seconds
    if (!props.detectedFace) {
      const now = Date.now()
      if (now - lastTalkAnimChangeRef.current > 2000 + Math.random() * 2000) {
        targetLookAt.current.set(
          (Math.random() - 0.5) * 0.1, // Reduced range for less erratic movement
          (Math.random() - 0.5) * 0.1 + 0.05, // Smaller vertical movement
          1
        )
        lastTalkAnimChangeRef.current = now
      }
    } else {
      // Map detected face coordinates to eye movement
      // Apply smoothing and deadzone to prevent micro-movements
      const deadzone = 0.01
      const faceX = props.detectedFace.x
      const faceY = props.detectedFace.y
      
      // Only move eyes if the face movement is significant
      if (Math.abs(faceX) > deadzone || Math.abs(faceY) > deadzone) {
        // Apply non-linear scaling for a more natural response
        // Stronger movements have more effect, subtle movements less effect
        const scaledX = Math.sign(faceX) * Math.pow(Math.abs(faceX), 1.5) * 0.07
        const scaledY = Math.sign(faceY) * Math.pow(Math.abs(faceY), 1.5) * 0.07
        
        targetLookAt.current.set(
          scaledX,
          scaledY + 0.05, // Small offset to keep eyes naturally positioned
          1
        )
      }
    }
    
    // Calculate desired movement
    const desiredMovement = new Vector3()
    desiredMovement.subVectors(targetLookAt.current, lookAt.current)
    
    // Apply spring physics for natural movement
    // Calculate new velocity with damping
    previousVelocity.current.multiplyScalar(dampingFactor)
    previousVelocity.current.add(desiredMovement.multiplyScalar(delta * 1.5))
    
    // Limit maximum velocity to prevent erratic movements
    if (previousVelocity.current.length() > maxEyeMovementSpeed) {
      previousVelocity.current.normalize().multiplyScalar(maxEyeMovementSpeed)
    }
    
    // Apply velocity to position
    lookAt.current.add(previousVelocity.current)
    
    // Apply to morph targets for eyes if they exist
    if (headMeshRef.current?.morphTargetDictionary && headMeshRef.current?.morphTargetInfluences) {
      const eyeUpDownIdx = headMeshRef.current.morphTargetDictionary['Eyes_Up_Down']
      const eyeLeftRightIdx = headMeshRef.current.morphTargetDictionary['Eyes_Left_Right']
      const eyesBlinkIdx = headMeshRef.current.morphTargetDictionary['Eyes_Blink']
      
      // Handle eye up/down movement
      if (eyeUpDownIdx !== undefined) {
        // Map y coordinate to up/down eye movement with softer curve
        // Use a gentler cubic function for more natural eye behavior
        const upDownValue = Math.max(-0.5, Math.min(0.5, lookAt.current.y * 1.5))
        headMeshRef.current.morphTargetInfluences[eyeUpDownIdx] = upDownValue
      }
      
      // Handle eye left/right movement
      if (eyeLeftRightIdx !== undefined) {
        // Map x coordinate to left/right eye movement with softer curve
        // Use a gentler cubic function for more natural eye behavior
        const leftRightValue = Math.max(-0.5, Math.min(0.5, lookAt.current.x * 1.5))
        headMeshRef.current.morphTargetInfluences[eyeLeftRightIdx] = leftRightValue
      }
      
      // Handle natural blinking
      if (eyesBlinkIdx !== undefined) {
        const now = Date.now()
        
        // Check if it's time to blink
        if (now - lastBlinkTime.current > blinkInterval.current) {
          // Trigger blink
          headMeshRef.current.morphTargetInfluences[eyesBlinkIdx] = 1;
          
          // Reset after 150ms (duration of a blink)
          setTimeout(() => {
            if (headMeshRef.current?.morphTargetInfluences) {
              headMeshRef.current.morphTargetInfluences[eyesBlinkIdx] = 0;
            }
          }, 150);
          
          // Set next blink time (random interval between 3-5 seconds)
          lastBlinkTime.current = now;
          blinkInterval.current = Math.random() * 2000 + 3000;
        }
      }
    }
    
    // Apply lip sync when speaking
    if (props.isSpeaking && props.lipSyncData !== undefined && headMeshRef.current?.morphTargetDictionary && headMeshRef.current?.morphTargetInfluences) {
      // Get the current lip sync value (0-1)
      const lipValue = props.lipSyncData
      
      // Reset all mouth morphs first
      Object.values(phonemeToViseme).forEach(morphName => {
        const morphIndex = headMeshRef.current?.morphTargetDictionary?.[morphName]
        if (morphIndex !== undefined && headMeshRef.current?.morphTargetInfluences) {
          // Don't reset eye-related morphs
          if (morphName !== phonemeToViseme['G'] && 
              morphName !== phonemeToViseme['H'] && 
              morphName !== phonemeToViseme['I']) {
            headMeshRef.current.morphTargetInfluences[morphIndex] = 0
          }
        }
      })
      
      // Use dynamic patterns to simulate speech
      const time = timeRef.current * 12  // Speed up time for natural variation
      
      // Generate semi-random variations based on lip sync value and time
      const variationA = Math.sin(time) * 0.2 * lipValue
      const variationB = Math.sin(time * 1.3) * 0.2 * lipValue
      const variationC = Math.cos(time * 0.7) * 0.15 * lipValue
      
      // Apply different mouth shapes based on patterns and lip sync value
      // Mouth open - basic speech movement
      const mouthOpenIndex = headMeshRef.current?.morphTargetDictionary?.[phonemeToViseme['D']]
      if (mouthOpenIndex !== undefined && headMeshRef.current?.morphTargetInfluences) {
        // Base mouth opening movement
        const openAmount = Math.max(0, lipValue * 0.7 + variationA)
        headMeshRef.current.morphTargetInfluences[mouthOpenIndex] = openAmount
      }
      
      // Jaw open - follows mouth movement
      const jawOpenIndex = headMeshRef.current?.morphTargetDictionary?.[phonemeToViseme['E']]
      if (jawOpenIndex !== undefined && headMeshRef.current?.morphTargetInfluences) {
        const jawAmount = Math.max(0, lipValue * 0.5 + variationB * 0.3)
        headMeshRef.current.morphTargetInfluences[jawOpenIndex] = jawAmount
      }
      
      // 'A' sound (wide mouth)
      const wideIndex = headMeshRef.current?.morphTargetDictionary?.[phonemeToViseme['A']]
      if (wideIndex !== undefined && variationA > 0 && headMeshRef.current?.morphTargetInfluences) {
        headMeshRef.current.morphTargetInfluences[wideIndex] = variationA * 0.8
      }
      
      // 'B' sound (round mouth)
      const roundIndex = headMeshRef.current?.morphTargetDictionary?.[phonemeToViseme['B']]
      if (roundIndex !== undefined && variationB > 0 && headMeshRef.current?.morphTargetInfluences) {
        headMeshRef.current.morphTargetInfluences[roundIndex] = variationB * 0.7
      }
      
      // 'C' sound (narrow mouth)
      const narrowIndex = headMeshRef.current?.morphTargetDictionary?.[phonemeToViseme['C']]
      if (narrowIndex !== undefined && variationC > 0 && headMeshRef.current?.morphTargetInfluences) {
        headMeshRef.current.morphTargetInfluences[narrowIndex] = variationC * 0.6
      }
      
      // Maintain slight smile while talking
      const smileIndex = headMeshRef.current?.morphTargetDictionary?.[phonemeToViseme['F']]
      if (smileIndex !== undefined && headMeshRef.current?.morphTargetInfluences) {
        // Reduce smile when mouth is open but keep some expression
        const smileAmount = Math.max(0.1, 0.3 - (lipValue * 0.2))
        headMeshRef.current.morphTargetInfluences[smileIndex] = smileAmount
      }
    } 
    // Idle animations when not speaking
    else if (headMeshRef.current?.morphTargetDictionary && headMeshRef.current?.morphTargetInfluences) {
      // Reset all mouth morphs except smile, handled by the useEffect
      
      // Occasional blinking in addition to the timed blinking
      const blinkIndex = headMeshRef.current.morphTargetDictionary?.[phonemeToViseme['G']]
      if (blinkIndex !== undefined) {
        // Random blinking (independent of the timed blinking)
        const shouldBlink = Math.sin(timeRef.current * 0.5) > 0.95
        if (shouldBlink) {
          headMeshRef.current.morphTargetInfluences[blinkIndex] = 1;
          
          // Reset after short duration
          setTimeout(() => {
            if (headMeshRef.current?.morphTargetInfluences) {
              headMeshRef.current.morphTargetInfluences[blinkIndex] = 0;
            }
          }, 150);
        }
      }
    }
  })
  
  // Reset mouth morphs when not speaking
  useEffect(() => {
    if (!props.isSpeaking && headMeshRef.current?.morphTargetDictionary && headMeshRef.current?.morphTargetInfluences) {
      // Reset all mouth-related morphs to ensure clean state
      ['A', 'B', 'C', 'D', 'E'].forEach(phoneme => {
        const morphName = phonemeToViseme[phoneme]
        const morphIndex = headMeshRef.current?.morphTargetDictionary?.[morphName]
        if (morphIndex !== undefined && headMeshRef.current?.morphTargetInfluences) {
          // Gradually reset to avoid sudden changes
          const currentValue = headMeshRef.current.morphTargetInfluences[morphIndex]
          if (currentValue > 0) {
            // Animate the reset
            const resetDuration = 300 // ms
            const startTime = Date.now()
            const startValue = currentValue
            
            const animate = () => {
              const elapsed = Date.now() - startTime
              const progress = Math.min(1, elapsed / resetDuration)
              
              // Apply easing
              const easedProgress = 1 - Math.pow(1 - progress, 3) // Cubic ease out
              
              if (headMeshRef.current?.morphTargetInfluences && morphIndex !== undefined) {
                // Gradually decrease value
                headMeshRef.current.morphTargetInfluences[morphIndex] = startValue * (1 - easedProgress)
                
                if (progress < 1) {
                  requestAnimationFrame(animate)
                }
              }
            }
            
            animate()
          } else {
            headMeshRef.current.morphTargetInfluences[morphIndex] = 0
          }
        }
      })
      
      // Apply a subtle smile during idle state
      const smileIndex = headMeshRef.current?.morphTargetDictionary?.[phonemeToViseme['F']]
      if (smileIndex !== undefined && headMeshRef.current?.morphTargetInfluences) {
        const smileValue = 0.2 // Subtle default smile
        headMeshRef.current.morphTargetInfluences[smileIndex] = smileValue
      }
    }
  }, [props.isSpeaking, phonemeToViseme])
  
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="Armature" scale={0.01}>
          <primitive object={nodes.CC_Base_BoneRoot} />
          <skinnedMesh name="Bang" geometry={nodes.Bang.geometry} material={materials['Hair_Transparency.003']} skeleton={nodes.Bang.skeleton} />
          <skinnedMesh name="Bun" geometry={nodes.Bun.geometry} material={materials['Hair_Transparency.001']} skeleton={nodes.Bun.skeleton} />
          <group name="CC_Base_Teeth">
            <skinnedMesh name="CC_Base_Teeth_1" geometry={nodes.CC_Base_Teeth_1.geometry} material={materials.Std_Upper_Teeth} skeleton={nodes.CC_Base_Teeth_1.skeleton} />
            <skinnedMesh name="CC_Base_Teeth_2" geometry={nodes.CC_Base_Teeth_2.geometry} material={materials.Std_Lower_Teeth} skeleton={nodes.CC_Base_Teeth_2.skeleton} />
          </group>
          <group name="Hair_Base">
            <skinnedMesh name="Hair_Base_1" geometry={nodes.Hair_Base_1.geometry} material={materials.Hair_Transparency} skeleton={nodes.Hair_Base_1.skeleton} />
            <skinnedMesh name="Hair_Base_2" geometry={nodes.Hair_Base_2.geometry} material={materials.Scalp_Transparency} skeleton={nodes.Hair_Base_2.skeleton} />
          </group>
          <skinnedMesh name="High_Heels" geometry={nodes.High_Heels.geometry} material={materials.High_Heels} skeleton={nodes.High_Heels.skeleton} />
          <skinnedMesh name="Knee_length_skirt" geometry={nodes.Knee_length_skirt.geometry} material={materials.Knee_length_skirt} skeleton={nodes.Knee_length_skirt.skeleton} />
          <skinnedMesh name="Real_Hair" geometry={nodes.Real_Hair.geometry} material={materials['Hair_Transparency.002']} skeleton={nodes.Real_Hair.skeleton} />
          <skinnedMesh name="Rolled_sleeves_shirt" geometry={nodes.Rolled_sleeves_shirt.geometry} material={materials.Rolled_sleeves_shirt} skeleton={nodes.Rolled_sleeves_shirt.skeleton} />
          <skinnedMesh name="Underwear_Bottoms" geometry={nodes.Underwear_Bottoms.geometry} material={materials.Underwear_Bottoms} skeleton={nodes.Underwear_Bottoms.skeleton} />
          <group name="CC_Base_Body">
            <skinnedMesh 
              ref={headMeshRef}
              name="CC_Base_Body_1" 
              geometry={nodes.CC_Base_Body_1.geometry} 
              material={materials.Std_Skin_Head} 
              skeleton={nodes.CC_Base_Body_1.skeleton} 
              morphTargetDictionary={nodes.CC_Base_Body_1.morphTargetDictionary} 
              morphTargetInfluences={nodes.CC_Base_Body_1.morphTargetInfluences} 
            />
            <skinnedMesh name="CC_Base_Body_2" geometry={nodes.CC_Base_Body_2.geometry} material={materials.Std_Skin_Body} skeleton={nodes.CC_Base_Body_2.skeleton} morphTargetDictionary={nodes.CC_Base_Body_2.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Body_2.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_Body_3" geometry={nodes.CC_Base_Body_3.geometry} material={materials.Std_Skin_Arm} skeleton={nodes.CC_Base_Body_3.skeleton} morphTargetDictionary={nodes.CC_Base_Body_3.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Body_3.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_Body_4" geometry={nodes.CC_Base_Body_4.geometry} material={materials.Std_Skin_Leg} skeleton={nodes.CC_Base_Body_4.skeleton} morphTargetDictionary={nodes.CC_Base_Body_4.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Body_4.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_Body_5" geometry={nodes.CC_Base_Body_5.geometry} material={materials.Std_Nails} skeleton={nodes.CC_Base_Body_5.skeleton} morphTargetDictionary={nodes.CC_Base_Body_5.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Body_5.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_Body_6" geometry={nodes.CC_Base_Body_6.geometry} material={materials.Std_Eyelash} skeleton={nodes.CC_Base_Body_6.skeleton} morphTargetDictionary={nodes.CC_Base_Body_6.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Body_6.morphTargetInfluences} />
          </group>
          <group name="CC_Base_Eye">
            <skinnedMesh name="CC_Base_Eye_1" geometry={nodes.CC_Base_Eye_1.geometry} material={materials.Std_Eye_R} skeleton={nodes.CC_Base_Eye_1.skeleton} morphTargetDictionary={nodes.CC_Base_Eye_1.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Eye_1.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_Eye_2" geometry={nodes.CC_Base_Eye_2.geometry} material={materials.Std_Cornea_R} skeleton={nodes.CC_Base_Eye_2.skeleton} morphTargetDictionary={nodes.CC_Base_Eye_2.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Eye_2.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_Eye_3" geometry={nodes.CC_Base_Eye_3.geometry} material={materials.Std_Eye_L} skeleton={nodes.CC_Base_Eye_3.skeleton} morphTargetDictionary={nodes.CC_Base_Eye_3.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Eye_3.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_Eye_4" geometry={nodes.CC_Base_Eye_4.geometry} material={materials.Std_Cornea_L} skeleton={nodes.CC_Base_Eye_4.skeleton} morphTargetDictionary={nodes.CC_Base_Eye_4.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Eye_4.morphTargetInfluences} />
          </group>
          <group name="CC_Base_EyeOcclusion">
            <skinnedMesh name="CC_Base_EyeOcclusion_1" geometry={nodes.CC_Base_EyeOcclusion_1.geometry} material={materials.Std_Eye_Occlusion_R} skeleton={nodes.CC_Base_EyeOcclusion_1.skeleton} morphTargetDictionary={nodes.CC_Base_EyeOcclusion_1.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_EyeOcclusion_1.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_EyeOcclusion_2" geometry={nodes.CC_Base_EyeOcclusion_2.geometry} material={materials.Std_Eye_Occlusion_L} skeleton={nodes.CC_Base_EyeOcclusion_2.skeleton} morphTargetDictionary={nodes.CC_Base_EyeOcclusion_2.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_EyeOcclusion_2.morphTargetInfluences} />
          </group>
          <group name="CC_Base_TearLine">
            <skinnedMesh name="CC_Base_TearLine_1" geometry={nodes.CC_Base_TearLine_1.geometry} material={materials.Std_Tearline_R} skeleton={nodes.CC_Base_TearLine_1.skeleton} morphTargetDictionary={nodes.CC_Base_TearLine_1.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_TearLine_1.morphTargetInfluences} />
            <skinnedMesh name="CC_Base_TearLine_2" geometry={nodes.CC_Base_TearLine_2.geometry} material={materials.Std_Tearline_L} skeleton={nodes.CC_Base_TearLine_2.skeleton} morphTargetDictionary={nodes.CC_Base_TearLine_2.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_TearLine_2.morphTargetInfluences} />
          </group>
          <skinnedMesh name="CC_Base_Tongue" geometry={nodes.CC_Base_Tongue.geometry} material={materials.Std_Tongue} skeleton={nodes.CC_Base_Tongue.skeleton} morphTargetDictionary={nodes.CC_Base_Tongue.morphTargetDictionary} morphTargetInfluences={nodes.CC_Base_Tongue.morphTargetInfluences} />
          <group name="Female_Angled">
            <skinnedMesh name="Female_Angled_1" geometry={nodes.Female_Angled_1.geometry} material={materials.Female_Angled_Transparency} skeleton={nodes.Female_Angled_1.skeleton} morphTargetDictionary={nodes.Female_Angled_1.morphTargetDictionary} morphTargetInfluences={nodes.Female_Angled_1.morphTargetInfluences} />
            <skinnedMesh name="Female_Angled_2" geometry={nodes.Female_Angled_2.geometry} material={materials.Female_Angled_Base_Transparency} skeleton={nodes.Female_Angled_2.skeleton} morphTargetDictionary={nodes.Female_Angled_2.morphTargetDictionary} morphTargetInfluences={nodes.Female_Angled_2.morphTargetInfluences} />
          </group>
        </group>
      </group>
    </group>
  )
}

// Preload model with error handling
try {
  useGLTF.preload('/models/ayla/Ayla.glb');
  // Don't need to log successful preloads
  // console.log('Preloaded Ayla model')
} catch (error) {
  // Only log actual errors
  console.error('Failed to load model');
}

