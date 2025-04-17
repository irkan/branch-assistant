import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Html } from '@react-three/drei';
import { Model as Character } from './Character';
import LoadingIndicator from './LoadingIndicator';
import './Scene3D.css';
import * as THREE from 'three';

interface Scene3DProps {
  isSpeaking: boolean;
  isListening: boolean;
  lipSyncValue: number;
  isProcessing: boolean;
  detectedFace?: string; // Base64 string of detected face
  isFaceDetected: boolean;
  errorMessage?: string | null; // Add error message prop
}

const Scene3D: React.FC<Scene3DProps> = ({ 
  isSpeaking, 
  isListening, 
  lipSyncValue,
  isProcessing,
  detectedFace,
  isFaceDetected,
  errorMessage
}) => {
  const characterRef = useRef<THREE.Group>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [faceImageVisible, setFaceImageVisible] = useState(false);
  
  // Handle face detection state changes
  useEffect(() => {
    if (isFaceDetected && detectedFace) {
      // Log face image data for debugging
      console.log('Scene3D received face image:', detectedFace?.substring(0, 100) + '...');
      
      // Show face image when detected
      setFaceImageVisible(true);
      
      // Animate overlay removal after face is detected
      setTimeout(() => {
        setOverlayVisible(false);
      }, 500);
    } else {
      // Log when face image is lost
      console.log('Scene3D: Face not detected or image missing');
      
      // Hide face image and show overlay if face detection is lost
      setFaceImageVisible(false);
      setOverlayVisible(true);
    }
  }, [isFaceDetected, detectedFace]);
  
  return (
    <div className="scene-container">
      {/* Bank branch background image */}
      <div className="background-image" />
      
      {/* Dark overlay that disappears after face detection */}
      {overlayVisible && (
        <div 
          className="face-detection-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 20,
            transition: 'opacity 0.7s ease-in-out',
            opacity: isFaceDetected ? 0 : 1,
            pointerEvents: isFaceDetected ? 'none' : 'auto'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '20px' }}>
              Üzünüzü kameraya göstərin
            </div>
            {errorMessage && (
              <div style={{ 
                fontSize: '16px', 
                color: '#ff6666', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: '5px',
                maxWidth: '350px'
              }}>
                {errorMessage}
              </div>
            )}
            <LoadingIndicator isVisible={true} position="centered" />
          </div>
        </div>
      )}
      
      {/* Detected face image display in top right corner */}
      {faceImageVisible && detectedFace && (
        <>
          <div 
            className="detected-face-container"
            style={{
              position: 'absolute',
              top: '40px',
              right: '40px',
              zIndex: 25,
              transition: 'all 0.5s ease-in-out',
              transform: `translateX(${isFaceDetected ? '0' : '100%'})`,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7), 0 0 15px rgba(0, 102, 255, 0.7)',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '5px solid',
              borderColor: '#0066cc',
              width: '240px',
              height: '240px',
              animation: 'pulse-border 2s infinite',
              background: 'linear-gradient(135deg, #ffffff, #0066cc)'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                boxShadow: 'inset 0 0 15px rgba(255, 255, 255, 0.8)',
                animation: 'pulse-inner 2.5s infinite',
                pointerEvents: 'none',
                zIndex: 2
              }}
            />
            <img 
              src={detectedFace} 
              alt="Detected Face" 
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover',
                zIndex: 1,
                position: 'relative'
              }} 
              onError={(e) => console.error('Image failed to load', e)}
              onLoad={() => console.log('Face image loaded successfully')}
            />
          </div>
          
          {/* User info badge under avatar */}
          <div 
            style={{
              position: 'absolute',
              top: '290px',
              right: '40px',
              zIndex: 24,
              padding: '8px 20px',
              background: 'rgba(0, 102, 204, 0.85)',
              borderRadius: '25px',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
              transform: `translateX(${isFaceDetected ? '0' : '100%'})`,
              transition: 'all 0.7s ease-in-out',
              transitionDelay: '0.2s',
              display: 'flex',
              alignItems: 'center',
              minWidth: '180px',
              justifyContent: 'center'
            }}
          >
            <span>Müştəri #1829</span>
          </div>
        </>
      )}
      
      {/* CSS animations */}
      <style>
        {`
          @keyframes pulse-border {
            0% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7), 0 0 15px rgba(0, 102, 255, 0.5); border-color: #0066cc; }
            50% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7), 0 0 25px rgba(0, 102, 255, 0.8); border-color: #3399ff; }
            100% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7), 0 0 15px rgba(0, 102, 255, 0.5); border-color: #0066cc; }
          }
          
          @keyframes pulse-inner {
            0% { opacity: 0.3; }
            50% { opacity: 0.6; }
            100% { opacity: 0.3; }
          }
        `}
      </style>
      
      {/* 3D Canvas */}
      <div className="canvas-container">
        <Canvas shadows>
          <Suspense fallback={null}>
            {/* Camera positioned even higher for better top-down perspective */}
            <PerspectiveCamera makeDefault position={[0, 3.0, 2.8]} fov={30} />
            
            {/* Soft ambient lighting */}
            <ambientLight intensity={0.7} />
            
            {/* Main directional light from front-top */}
            <directionalLight 
              position={[3, 5, 5]} 
              intensity={0.9} 
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
                position={[0, 0.9, 0]} 
                scale={[1.55, 1.55, 1.55]} 
                rotation={[Math.PI * 0.06, 0.5, 0]}
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
