import * as THREE from 'three'
import React, { useRef, useEffect } from 'react'
import { useGLTF, useFBX } from '@react-three/drei'
import { useFrame, useGraph } from '@react-three/fiber'
import { SkeletonUtils } from 'three-stdlib'

type AnimatedCharacterProps = {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
} & React.JSX.IntrinsicElements['group'];

export function AnimatedCharacter(props: AnimatedCharacterProps) {
  const group = useRef<THREE.Group>(null)
  
  // Load model
  const { scene } = useGLTF('/models/ayla/Ayla.glb')
  
  // Clone the scene for animations
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  
  // Load stand animation - use different approach with .glb instead of .fbx
  const standMotion = useGLTF('/models/ayla/Ayla_Stand_Motion.glb')
  
  // Animation related refs
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  
  // Setup animation with the GLB animation
  useEffect(() => {
    if (!clone) return
    
    // Only log once when setting up, not every time
    console.log('Setting up character animation')
    
    // Create a mixer connected to the cloned scene
    const mixer = new THREE.AnimationMixer(clone)
    mixerRef.current = mixer
    
    // Get the stand animation from the GLB
    if (standMotion.animations && standMotion.animations.length > 0) {
      const standAnim = standMotion.animations[0]
      
      // Log animation details only in development, not in production
      if (process.env.NODE_ENV === 'development') {
        console.debug('Animation loaded:', standAnim.name)
      }
      
      // Create the action
      const action = mixer.clipAction(standAnim)
      
      // Configure the action
      action.loop = THREE.LoopRepeat
      action.clampWhenFinished = false
      action.timeScale = 1.0
      action.play()
    } else {
      // Only log errors
      console.error('No animations found in GLB file')
    }
    
    return () => {
      mixer.stopAllAction()
    }
  }, [clone, standMotion.animations])
  
  // Update animation in frame loop
  useFrame((state, delta) => {
    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }
  })
  
  return (
    <group ref={group} {...props}>
      <primitive object={clone} />
    </group>
  )
}

// Preload model
useGLTF.preload('/models/ayla/Ayla.glb') 