import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Html } from '@react-three/drei';
import Character from './Character';
import LoadingIndicator from './LoadingIndicator';
import './Scene3D.css';
import * as THREE from 'three';

interface Scene3DProps {
  isSpeaking: boolean;
  isListening: boolean;
  lipSyncValue: number;
  isProcessing: boolean;
}

const Scene3D: React.FC<Scene3DProps> = ({ 
  isSpeaking, 
  isListening, 
  lipSyncValue,
  isProcessing
}) => {
  const characterRef = useRef<THREE.Group>(null);
  
  return (
    <div className="scene-container">
      {/* Bank branch background image */}
      <div className="background-image" />
      
      {/* 3D Canvas */}
      <div className="canvas-container">
        <Canvas shadows>
          <Suspense fallback={null}>
            {/* Camera positioned to show character from chest up */}
            <PerspectiveCamera makeDefault position={[0, 1.2, 2.5]} fov={45} />
            
            {/* Soft ambient lighting */}
            <ambientLight intensity={0.8} />
            
            {/* Main directional light from front-top */}
            <directionalLight 
              position={[0, 5, 5]} 
              intensity={1.0} 
              castShadow 
              shadow-mapSize-width={1024} 
              shadow-mapSize-height={1024}
            />
            
            {/* Fill light from left */}
            <pointLight position={[-3, 1, 0]} intensity={0.7} color="#ffffff" />
            
            {/* Fill light from right */}
            <pointLight position={[3, 1, 0]} intensity={0.7} color="#ffffff" />
            
            {/* Character component with ref for positioning loading indicator */}
            <group ref={characterRef}>
              <Character 
                position={[0, -1.8, 0]} 
                scale={[2.5, 2.5, 2.5]} 
                rotation={[0, 0, 0]}
                isSpeaking={isSpeaking}
                isListening={isListening}
                lipSyncData={lipSyncValue}
              />
              
              {/* Loading indicator positioned above character's head */}
              {isProcessing && (
                <mesh position={[0, 2.2, 0]}>
                  <boxGeometry args={[0.1, 0.1, 0.1]} />
                  <meshBasicMaterial visible={false} />
                  <Html position={[0, 0, 0]} center>
                    <LoadingIndicator isVisible={true} position="above-head" />
                  </Html>
                </mesh>
              )}
            </group>
            
            {/* Environment map for realistic lighting */}
            <Environment preset="city" />
          </Suspense>
          
          {/* Disable orbit controls for production, enable for development */}
          {/* <OrbitControls /> */}
        </Canvas>
      </div>
    </div>
  );
};

export default Scene3D;
