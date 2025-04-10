import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Scene3D from './components/Scene3D';
import SpeechRecognition from './components/SpeechRecognition';
import ApiIntegration from './components/ApiIntegration';
import LipSync from './components/LipSync';
import InterruptionHandler from './components/InterruptionHandler';
import { CustomerMemoryUtils, CustomerData } from './components/CustomerMemory';
import * as faceapi from 'face-api.js';

function App() {
  // State for speech and animation
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lipSyncValue, setLipSyncValue] = useState(0);
  const [userSpeech, setUserSpeech] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  
  // State for face recognition
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerData | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      // Use CDN for models instead of local files to avoid tensor shape mismatch issues
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      
      try {
        // Load models sequentially with error handling for each
        console.log('Loading face-api models from CDN...');
        
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          console.log('TinyFaceDetector model loaded successfully');
        } catch (e) {
          console.error('Failed to load TinyFaceDetector model:', e);
        }
        
        try {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          console.log('FaceLandmark68 model loaded successfully');
        } catch (e) {
          console.error('Failed to load FaceLandmark68 model:', e);
        }
        
        try {
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          console.log('FaceRecognition model loaded successfully');
        } catch (e) {
          console.error('Failed to load FaceRecognition model:', e);
        }
        
        // Only set as loaded if we have at least the detector
        if (faceapi.nets.tinyFaceDetector.isLoaded) {
          setIsModelLoaded(true);
          console.log('Face recognition models loaded successfully');
          startVideo();
        } else {
          console.error('Essential face detection model failed to load');
          // Continue without face recognition
          setIsModelLoaded(false);
        }
      } catch (error) {
        console.error('Error in face-api model loading process:', error);
        // Continue without face recognition
        setIsModelLoaded(false);
      }
    };
    
    loadModels();
    
    // Cleanup
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  // Start video stream
  const startVideo = async () => {
    if (videoRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        videoRef.current.srcObject = stream;
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    }
  };
  
  // Face detection and recognition
  useEffect(() => {
    if (isModelLoaded && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const interval = setInterval(async () => {
        if (video.readyState === 4) {
          try {
            // First detect faces with just the detector
            const detections = await faceapi.detectAllFaces(video, 
              new faceapi.TinyFaceDetectorOptions());
            
            // Draw basic detections only if no customer is detected yet
            if (!currentCustomer) {
              // Make sure canvas dimensions match video dimensions
              canvas.width = video.width;
              canvas.height = video.height;
              
              const displaySize = { width: video.width, height: video.height };
              faceapi.matchDimensions(canvas, displaySize);
              const resizedDetections = faceapi.resizeResults(detections, displaySize);
              
              // Clear canvas before drawing
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw detection boxes with thicker lines and brighter color
                ctx.strokeStyle = '#00AAFF';
                ctx.lineWidth = 3;
                
                if (resizedDetections.length > 0) {
                  resizedDetections.forEach(detection => {
                    const box = detection.box;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);
                  });
                }
              }
            } else {
              // Clear the canvas if customer is already detected
              canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            // Only proceed with landmarks and descriptors if models are loaded
            if (detections.length > 0 && 
                faceapi.nets.faceLandmark68Net.isLoaded && 
                faceapi.nets.faceRecognitionNet.isLoaded) {
              
              try {
                // Process each face separately with proper type handling
                for (const detection of detections) {
                  // Get face landmarks
                  const landmarks = await faceapi.detectFaceLandmarks(video);
                  
                  if (landmarks) {
                    // Get face descriptor
                    const descriptor = await faceapi.computeFaceDescriptor(video);
                    
                    if (descriptor) {
                      // If we have a valid descriptor, use it for recognition
                      if (Array.isArray(descriptor)) {
                        if (descriptor.length > 0) {
                          recognizeCustomer(descriptor[0]);
                        }
                      } else {
                        recognizeCustomer(descriptor);
                      }
                    }
                  }
                }
              } catch (innerError) {
                console.error('Error processing face details:', innerError);
              }
            }
          } catch (error) {
            console.error('Error in face detection process:', error);
            // Continue without face recognition for this frame
          }
        }
      }, 500); // Reduced interval for more responsive detection
      
      return () => clearInterval(interval);
    }
  }, [isModelLoaded, currentCustomer]);
  
  // Recognize customer from face descriptor
  const recognizeCustomer = (faceDescriptor: Float32Array) => {
    const currentTime = Date.now();
    const timeThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    // Check if this face matches any existing customer
    let matchedCustomer: CustomerData | null = null;
    let isNew = true;
    
    const customers = CustomerMemoryUtils.loadCustomers();
    
    for (const customer of customers) {
      const distance = faceapi.euclideanDistance(faceDescriptor, customer.faceDescriptor);
      
      // If distance is below threshold, consider it a match
      if (distance < 0.6) {
        matchedCustomer = customer;
        isNew = false;
        
        // Update last seen time
        customer.lastSeen = currentTime;
        CustomerMemoryUtils.saveCustomers(customers);
        break;
      }
    }
    
    // If no match found, create new customer
    if (!matchedCustomer) {
      const newCustomer: CustomerData = {
        id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        faceDescriptor,
        lastSeen: currentTime,
        conversations: []
      };
      
      customers.push(newCustomer);
      CustomerMemoryUtils.saveCustomers(customers);
      matchedCustomer = newCustomer;
    }
    
    // Check if we should greet the customer (if they're new or returning after threshold)
    const shouldGreet = isNew || 
      (matchedCustomer.lastSeen < currentTime - timeThreshold);
    
    // Only update state if customer changed or greeting status changed
    if (currentCustomer?.id !== matchedCustomer.id || isNewCustomer !== shouldGreet) {
      setCurrentCustomer(matchedCustomer);
      setIsNewCustomer(shouldGreet);
      
      // If should greet, trigger greeting
      if (shouldGreet && !isSpeaking && !isListening) {
        greetCustomer(isNew);
      }
    }
  };
  
  // Greet customer based on whether they're new or returning
  const greetCustomer = (isNew: boolean) => {
    setIsProcessing(true);
    
    // Simulate API call for greeting
    setTimeout(() => {
      const greeting = isNew 
        ? "Salam! ABB Banka xoş gəlmisiniz. Mən Ayla, sizin virtual köməkçinizəm. Sizə necə kömək edə bilərəm?"
        : "Yenidən xoş gəldiniz! Sizə necə kömək edə bilərəm?";
      
      setAiResponse(greeting);
      setIsProcessing(false);
      startSpeaking(greeting);
    }, 1000);
  };
  
  // Handle speech recognition result
  const handleSpeechResult = (text: string) => {
    setUserSpeech(text);
    setIsProcessing(true);
    
    // Record conversation if we have a customer
    if (currentCustomer) {
      // We'll add the AI response after we get it
    }
  };
  
  // Handle API response
  const handleApiResponse = (response: string, audioUrl?: string) => {
    setAiResponse(response);
    setAudioUrl(audioUrl);
    setIsProcessing(false);
    
    // Record conversation if we have a customer
    if (currentCustomer) {
      CustomerMemoryUtils.addConversation(currentCustomer.id, userSpeech, response);
    }
    
    startSpeaking(response);
  };
  
  // Start speaking
  const startSpeaking = (text: string) => {
    setIsSpeaking(true);
    setIsListening(false);
  };
  
  // Handle playback complete
  const handlePlaybackComplete = () => {
    setIsSpeaking(false);
    setIsListening(true);
  };
  
  // Handle interruption
  const handleInterruption = () => {
    console.log('Speech interrupted by user');
    setIsSpeaking(false);
    setIsListening(true);
  };
  
  return (
    <div className="App">
      {/* Main 3D Scene */}
      <Scene3D 
        isSpeaking={isSpeaking} 
        isListening={isListening} 
        lipSyncValue={lipSyncValue}
        isProcessing={isProcessing}
      />
      
      {/* Speech Recognition */}
      <SpeechRecognition
        onResult={handleSpeechResult}
        onListeningChange={setIsListening}
        language="az-AZ"
        autoStart={false}
      />
      
      {/* API Integration */}
      <ApiIntegration
        text={userSpeech}
        onResponse={handleApiResponse}
        onProcessingChange={setIsProcessing}
        customerHistory={currentCustomer ? CustomerMemoryUtils.getConversationHistory(currentCustomer.id) : []}
        isNewCustomer={isNewCustomer}
      />
      
      {/* Lip Sync */}
      <LipSync
        audioUrl={audioUrl}
        isPlaying={isSpeaking}
        onLipSyncValueChange={setLipSyncValue}
        onPlaybackComplete={handlePlaybackComplete}
      />
      
      {/* Interruption Handler */}
      <InterruptionHandler
        isSpeaking={isSpeaking}
        onInterrupt={handleInterruption}
      >
        {/* This is a wrapper component, no children needed */}
      </InterruptionHandler>
      
      {/* Face recognition video (centered with 85% opacity) */}
      <div 
        style={{ 
          position: 'absolute', 
          left: '50%', 
          top: '50%', 
          transform: 'translate(-50%, -50%)',
          width: '400px',
          height: '300px',
          opacity: currentCustomer ? 0 : 0.85, 
          zIndex: 20,
          transition: 'opacity 0.5s ease-in-out',
          pointerEvents: 'none',
          border: '3px solid #0066cc',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <video 
          ref={videoRef}
          width="400"
          height="300"
          autoPlay
          muted
          style={{ display: 'block' }}
          onPlay={() => console.log('Video is playing')}
        />
        <canvas ref={canvasRef} width="400" height="300" />
        
        {/* Watermark for face detection */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0, 102, 204, 0.7)',
          color: 'white',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          Face Detection
        </div>
      </div>
      
      {/* Debug info - remove in production */}
      <div style={{ position: 'absolute', left: 10, top: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px' }}>
        <p>Speaking: {isSpeaking ? 'Yes' : 'No'}</p>
        <p>Listening: {isListening ? 'Yes' : 'No'}</p>
        <p>Processing: {isProcessing ? 'Yes' : 'No'}</p>
        <p>Face API Loaded: {isModelLoaded ? 'Yes' : 'No'}</p>
        <p>Customer ID: {currentCustomer?.id || 'None'}</p>
        <p>New customer: {isNewCustomer ? 'Yes' : 'No'}</p>
        <p>Last speech: {userSpeech}</p>
        <p>Response: {aiResponse}</p>
      </div>
    </div>
  );
}

export default App;
