import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Scene3D from './components/Scene3D';
import SpeechRecognition, { SpeechRecognitionRef } from './components/SpeechRecognition';
import LipSync from './components/LipSync';
import InterruptionHandler from './components/InterruptionHandler';
import { CustomerMemoryUtils, CustomerData } from './components/CustomerMemory';
import * as faceapi from 'face-api.js';
import { mockSimaAPI, SimaResponse, canvasToBase64, generateGreeting } from './components/SimaIntegration';
import ChatBox from './components/ChatBox';
import { useAudio } from './hooks/useAudio';
import axios from 'axios';

function App() {
  // Video and canvas references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Speech recognition refs
  const speechRecognitionRef = useRef<SpeechRecognitionRef>(null);
  const microphoneActivationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio analysis refs
  const audioContext = useRef<AudioContext | null>(null);
  const audioAnalyser = useRef<AnalyserNode | null>(null);
  const audioDataArray = useRef<Uint8Array | null>(null);

  // Authentication and user states
  const [currentCustomer, setCurrentCustomer] = useState<CustomerData | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [simaUserData, setSimaUserData] = useState<SimaResponse | null>(null);
  
  // Face detection states
  const [detectedFaceImage, setDetectedFaceImage] = useState<string | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  // Speech and content states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lipSyncValue, setLipSyncValue] = useState(0);
  const [userSpeech, setUserSpeech] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasGreetingSent, setHasGreetingSent] = useState(false);

  // State variables for chat functionality
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'assistant' }[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const [detectedText, setDetectedText] = useState<string>('');

  // Face detection states
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [detectedFace, setDetectedFace] = useState<string | undefined>(undefined);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Handle listening state change - use callback to prevent re-renders
  const handleListeningChange = useCallback((listening: boolean) => {
    console.log(`Listening state changed to: ${listening}`);
    setIsListening(listening);
  }, []);
  
  // Handle speech recognition result
  const handleSpeechResult = useCallback(async (text: string) => {
    console.log(" SPEECH RECOGNIZED:", text);
    
    try {
      // Pause speech recognition while processing
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stopListening();
      }
      
      // Set state to indicate processing
      setIsSpeaking(true);
      
      // Store input for processing
      const userInput = text;
      
      // Send data to webhook and get audio file in response
      const webhookUrl = process.env.REACT_APP_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          // Use our proxy to avoid CORS issues
          // Extract the path part from webhook URL to make sure we're using the correct path
          const webhookParts = webhookUrl.split('/');
          const webhookPath = webhookParts.slice(3).join('/'); // Skip http://localhost:5678
          const proxyUrl = `/api/${webhookPath}`;
          
          console.log(`Sending data to webhook via proxy: ${proxyUrl}`);
          
          const webhookResponse = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: userInput,
              timestamp: new Date().toISOString(),
              source: 'speech_recognition'
            })
          });
          
          if (webhookResponse.ok) {
            console.log('Successfully sent data to webhook, processing response');
            
            try {
              // Get the audio file directly from the response
              const audioBlob = await webhookResponse.blob();
              console.log('Received audio data from webhook');
              
              // Create an object URL from the blob
              const audioUrl = URL.createObjectURL(audioBlob);
              
              // Play the audio with AAC type
              const audio = new Audio(audioUrl);
              
              // Set MIME type for AAC audio
              audio.setAttribute('type', 'audio/aac');
              
              // Set up event listeners for the audio
              audio.onended = () => {
                console.log("Speech playback complete, activating microphone...");
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl); // Clean up the URL
                
                // Resume speech recognition after audio completes
                setTimeout(() => {
                  if (speechRecognitionRef.current) {
                    speechRecognitionRef.current.startListening();
                  }
                }, 500);
              };
              
              // Handle errors in audio playback
              audio.onerror = (e) => {
                console.error('Error playing audio:', e);
                handleWebhookFailure();
              };
              
              // Start playback
              audio.play().catch(error => {
                console.error('Error starting audio playback:', error);
                handleWebhookFailure();
              });
            } catch (audioError) {
              console.error('Error processing audio from webhook:', audioError);
              handleWebhookFailure();
            }
          } else {
            console.error('Failed to send data to webhook:', await webhookResponse.text());
            handleWebhookFailure();
          }
        } catch (webhookError) {
          console.error('Error communicating with webhook:', webhookError);
          handleWebhookFailure();
        }
      } else {
        // No webhook URL configured
        handleWebhookFailure();
      }
    } catch (error) {
      console.error("Error processing speech:", error);
      setIsSpeaking(false);
      
      // Resume speech recognition even if there was an error
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.startListening();
      }
    }
  }, []);
  
  // Handle failures when webhook doesn't work
  const handleWebhookFailure = useCallback(() => {
    console.error("Webhook communication failed");
    setIsSpeaking(false);
    
    // Resume speech recognition after failure
    setTimeout(() => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.startListening();
      }
    }, 500);
  }, []);
  
  // Start speaking
  const startSpeaking = useCallback((text: string) => {
    console.log('Started speaking:', text);
    setIsSpeaking(true);
    setIsListening(false);
    // Stop listening while speaking
    if (speechRecognitionRef.current) {
      console.log('Stopping speech recognition during speaking');
      speechRecognitionRef.current.stopListening();
    } else {
      console.warn('Speech recognition ref is null, cannot stop listening');
    }

    // Schedule automatic activation of microphone after speaking
    const speakingDuration = Math.max(2000, text.length * 80); // Estimate duration based on text length
    console.log(`Scheduling microphone activation after ${speakingDuration}ms`);
    
    clearTimeout(microphoneActivationTimerRef.current || undefined);
    microphoneActivationTimerRef.current = setTimeout(() => {
      console.log('Automatic timeout after speaking, activating microphone');
      // Call this function directly instead of handlePlaybackComplete to avoid circular dependency
      setIsSpeaking(false);
      setLipSyncValue(0);
      
      // Delay a bit before activating microphone
      setTimeout(() => {
        // Only try to start listening if we're not already speaking
        if (!isSpeaking) {
          setIsListening(true);
          
          // Start speech recognition manually
          if (speechRecognitionRef.current) {
            console.log('Starting speech recognition after automatic timeout');
            try {
              speechRecognitionRef.current.startListening();
              console.log('Successfully started speech recognition after timeout');
            } catch (error) {
              console.error('Error starting speech recognition after timeout:', error);
            }
          }
        }
      }, 300);
    }, speakingDuration);
  }, [isSpeaking]);
  
  // Handle playback complete
  const handlePlaybackComplete = useCallback(() => {
    console.log('Speech playback complete, activating microphone...');
    setIsSpeaking(false);
    setLipSyncValue(0);
    
    // Clear any previous timeouts
    clearTimeout(microphoneActivationTimerRef.current || undefined);
    
    // Delay a bit before activating microphone
    microphoneActivationTimerRef.current = setTimeout(() => {
      // Only try to start listening if we're not already speaking
      if (!isSpeaking) {
        setIsListening(true);
        
        // Start speech recognition manually
        if (speechRecognitionRef.current) {
          console.log('Starting speech recognition after playback');
          try {
            speechRecognitionRef.current.startListening();
            console.log('Successfully started speech recognition');
          } catch (error) {
            console.error('Error starting speech recognition:', error);
          }
        } else {
          console.warn('Speech recognition ref is null, cannot start listening');
          
          // If ref is not available, try again in 500ms
          setTimeout(() => {
            if (speechRecognitionRef.current) {
              console.log('Delayed start of speech recognition after playback');
              try {
                speechRecognitionRef.current.startListening();
                console.log('Successfully started delayed speech recognition');
              } catch (error) {
                console.error('Error starting delayed speech recognition:', error);
              }
            }
          }, 500);
        }
      }
    }, 300);
  }, [isSpeaking]);
  
  // Handle interruption
  const handleInterruption = useCallback(() => {
    console.log('Speech interrupted, activating microphone...');
    setIsSpeaking(false);
    setLipSyncValue(0);
    
    // Clear any previous timeouts
    clearTimeout(microphoneActivationTimerRef.current || undefined);
    
    // Delay a bit before activating microphone
    microphoneActivationTimerRef.current = setTimeout(() => {
      // Only try to start listening if we're not already speaking
      if (!isSpeaking) {
        setIsListening(true);
        
        // Start speech recognition manually after interruption
        if (speechRecognitionRef.current) {
          console.log('Starting speech recognition after interruption');
          speechRecognitionRef.current.startListening();
        } else {
          console.warn('Speech recognition ref is null, cannot start listening');
          
          // If ref is not available, try again in 500ms
          setTimeout(() => {
            if (speechRecognitionRef.current) {
              console.log('Delayed start of speech recognition after interruption');
              speechRecognitionRef.current.startListening();
            }
          }, 500);
        }
      }
    }, 300);
  }, [isSpeaking]);
  
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
  
  // Start video stream with improved error handling
  const startVideo = async () => {
    if (!videoRef.current) {
      console.error('Video reference not available, cannot start video');
      return;
    }
    
    try {
      console.log('Attempting to access camera...');
      console.log('Available devices:');
      
      try {
        // List available devices for debugging
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          console.warn('No video input devices found!');
          setCameraError("Heç bir kamera tapılmadı. Zəhmət olmasa kamera qoşulduğundan əmin olun.");
        } else {
          console.log('Video devices:', videoDevices.map(d => `${d.label || 'Unnamed device'} (${d.deviceId.substring(0, 8)}...)`));
        }
      } catch (enumError) {
        console.error('Error listing devices:', enumError);
      }
      
      // First try to stop any existing streams
      if (videoRef.current.srcObject) {
        console.log('Stopping existing video stream');
        const existingStream = videoRef.current.srcObject as MediaStream;
        existingStream.getTracks().forEach(track => {
          console.log(`Stopping track: ${track.label || 'unnamed'} (${track.kind})`);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
      
      console.log('Requesting camera with HD resolution');
      
      // Request camera with constraints - try HD resolution first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      if (!stream) {
        throw new Error('Camera stream is null or undefined');
      }
      
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video tracks in the stream');
      }
      
      console.log(`Got ${videoTracks.length} video tracks:`, 
        videoTracks.map(track => `${track.label} (enabled: ${track.enabled}, muted: ${track.muted})`));
      
      // Set the stream to video element
      videoRef.current.srcObject = stream;
      console.log('Camera stream set to video element');
      
      // Attach more detailed event listeners
      videoRef.current.onloadedmetadata = () => {
        console.log('Video element loaded metadata, dimensions:', 
          `${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
      };
      
      videoRef.current.onloadeddata = () => {
        console.log('Video element loaded data, ready state:', videoRef.current?.readyState);
      };
      
      // Force video play (needed in some browsers)
      console.log('Attempting to play video element');
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Video is now playing successfully');
            
            // Clear any previous error
            setCameraError(null);
            
            // Check actual dimensions after playing
            setTimeout(() => {
              if (videoRef.current) {
                console.log('Video dimensions after play:', 
                  `${videoRef.current.videoWidth}x${videoRef.current.videoHeight} (ready: ${videoRef.current.readyState})`);
              }
            }, 500);
          })
          .catch(err => {
            console.error('Error playing video after getting stream:', err);
            setCameraError("Videonu başlatmaq mümkün olmadı. Zəhmət olmasa səhifədəki bir yerə klikləyin.");
            
            // Try to play again after user interaction
            const playVideoOnClick = () => {
              console.log('User clicked, trying to play video again');
              videoRef.current?.play()
                .then(() => {
                  console.log('Video started playing after user interaction');
                  setCameraError(null);
                })
                .catch(playErr => {
                  console.error('Still failed to play after user interaction:', playErr);
                });
              document.removeEventListener('click', playVideoOnClick);
            };
            document.addEventListener('click', playVideoOnClick);
          });
      }
      
      // Set up event listeners to detect if camera track ends unexpectedly
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          console.log('Camera track ended unexpectedly');
          setCameraError("Kamera bağlantısı kəsildi. Yenidən qoşulmağa çalışılır...");
          
          // Try to restart video after small delay
          setTimeout(() => startVideo(), 1000);
        };
        
        track.onmute = () => {
          console.log('Camera track muted');
          setCameraError("Kamera müvəqqəti olaraq əlçatan deyil. Yenidən qoşulmağa çalışılır...");
        };
        
        track.onunmute = () => {
          console.log('Camera track unmuted');
          setCameraError(null);
        };
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Camera access error details:', errorMessage);
      
      // Show user-friendly error message
      setCameraError(`Kameraya giriş mümkün olmadı: ${errorMessage}. Zəhmət olmasa icazə verin və ya başqa kamera seçin.`);
      
      // Try again with lower quality if high quality failed
      try {
        console.log('Trying with lower quality camera settings...');
        const lowQualityStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = lowQualityStream;
          videoRef.current.play().catch(playErr => {
            console.error('Error playing low quality video:', playErr);
          });
          console.log('Camera accessed with lower quality');
          
          // Clear error message
          setCameraError(null);
        }
      } catch (lowQualityError) {
        console.error('Failed to access camera even with lower quality:', lowQualityError);
        setCameraError("Kameranıza daxil olmaq mümkün olmadı. Lütfən kamera icazələrinizi yoxlayın və ya başqa bir kameradan istifadə edin.");
      }
    }
  };
  
  // Direct capture from video element instead of using canvas
  const captureVideoFrame = useCallback((): string | null => {
    try {
      // Reference to video element
      const video = videoRef.current;
      if (!video || video.readyState !== 4) {
        console.error('Video not ready for frame capture');
        return null;
      }
      
      // Get actual video dimensions
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      console.log('Capturing full video frame from dimensions:', width, height);
      
      // Create temp canvas with video dimensions
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        console.error('Failed to get canvas context');
        return null;
      }
      
      // Draw the full video frame to canvas
      tempCtx.drawImage(video, 0, 0, width, height);
      
      // Improve image quality
      const imageData = tempCtx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Apply basic image enhancement
      for (let i = 0; i < data.length; i += 4) {
        // Increase brightness and contrast slightly
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.2 + 138)); // Red
        data[i+1] = Math.min(255, Math.max(0, (data[i+1] - 128) * 1.2 + 138)); // Green
        data[i+2] = Math.min(255, Math.max(0, (data[i+2] - 128) * 1.2 + 138)); // Blue
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      
      // Convert to high quality JPEG
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
      
      console.log('Captured frame, data URL length:', dataUrl.length);
      return dataUrl;
    } catch (error) {
      console.error('Error capturing video frame:', error);
      return null;
    }
  }, []);
  
  // Greet customer based on whether they're new or returning
  const greetCustomer = useCallback((isNew: boolean) => {
    setIsProcessing(true);
    
    // Generic greeting if Sima API fails
    setTimeout(() => {
      const greeting = isNew 
        ? "Salam! ABB Banka xoş gəlmisiniz. Mən Ayla, sizin virtual köməkçinizəm. Sizə necə kömək edə bilərəm?"
        : "Yenidən xoş gəldiniz! Sizə necə kömək edə bilərəm?";
      
      setAiResponse(greeting);
      setIsProcessing(false);
      startSpeaking(greeting);
    }, 1000);
  }, [startSpeaking]);
  
  // Recognize customer from face descriptor
  const recognizeCustomer = useCallback(async (faceDescriptor: Float32Array, canvas: HTMLCanvasElement) => {
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
    
    // Only update state if customer changed
    if (currentCustomer?.id !== matchedCustomer.id) {
      // Update customer state
      setCurrentCustomer(matchedCustomer);
      setIsNewCustomer(isNew);
      
      // Note: We've moved the greeting functionality to the face detection logic
      // so we don't trigger it here anymore to avoid duplicate greetings
      console.log('Customer recognized, greeting will be handled by face detection process');
    }
  }, [currentCustomer]);
  
  // Define a function to manually trigger speech recognition
  const triggerSpeechRecognition = useCallback(() => {
    console.log('Manually triggering speech recognition');
    
    // Log the browser information for debugging
    console.log('Browser details:', 
      `${navigator.userAgent} - 
      Chrome: ${/Chrome/.test(navigator.userAgent)}, 
      Firefox: ${/Firefox/.test(navigator.userAgent)}, 
      Safari: ${/Safari/.test(navigator.userAgent)}`
    );
    
    // Make sure we're not speaking or processing
    if (isSpeaking) {
      console.log('Already speaking, stopping speech first');
      setIsSpeaking(false);
      setLipSyncValue(0);
    }
    
    // Set listening state to true
    setIsListening(true);
    
    // First try with the current ref
    if (speechRecognitionRef.current) {
      console.log('Speech recognition ref exists, starting listening');
      
    setTimeout(() => {
        speechRecognitionRef.current?.startListening();
      }, 100);
    } else {
      console.error('Speech recognition ref is null, cannot trigger manually');
      
      // Try again after a short delay in case the component is still initializing
      setTimeout(() => {
        if (speechRecognitionRef.current) {
          console.log('Delayed attempt to start speech recognition');
          speechRecognitionRef.current.startListening();
        } else {
          console.error('Speech recognition ref still null after delay');
        }
      }, 500);
    }
  }, [isSpeaking]);
  
  // Add a button to manually trigger speech recognition for testing
  useEffect(() => {
    // Add a debug key press handler to start speech recognition
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'm') {
        console.log('M key pressed, manually triggering speech recognition');
        triggerSpeechRecognition();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [triggerSpeechRecognition]);
  
  // Handle volume change - use callback to prevent re-renders
  const handleVolumeChange = useCallback((volume: number) => {
    // Optional: could add volume visualization or logic here
    // console.log(`Microphone volume: ${volume}`);
  }, []);

  // Use the same video stream for both video elements (debug and UI)
  useEffect(() => {
    // Copy video stream from hidden debug element to visible UI element when stream is available
    const copyVideoStream = () => {
      try {
        const debugVideo = videoRef.current;
        const faceVideo = document.getElementById('faceVideo') as HTMLVideoElement | null;
        
        if (!debugVideo) {
          console.log('Debug video reference not available yet');
          return;
        }
        
        if (!faceVideo) {
          console.log('Face video element not found in DOM yet');
          return;
        }
        
        if (!debugVideo.srcObject) {
          console.log('Debug video has no stream yet');
          return;
        }
        
        // Only set if not already set with the same stream
        if (faceVideo.srcObject !== debugVideo.srcObject) {
          console.log('Copying video stream to UI element');
          faceVideo.srcObject = debugVideo.srcObject;
          
          faceVideo.onloadedmetadata = () => {
            console.log('Face video got stream and metadata');
            faceVideo.play().catch(err => {
              console.error('Error playing face video:', err);
            });
          };
          
          faceVideo.onerror = (err) => {
            console.error('Face video element error:', err);
          };
        }
      } catch (error) {
        console.error('Error copying video stream:', error);
      }
    };
    
    // Try to copy stream immediately if available
    copyVideoStream();
    
    // Also set up an interval to try copying the stream multiple times
    // This helps in case the face video element isn't available immediately
    const streamCheckInterval = setInterval(() => {
      copyVideoStream();
    }, 1000);
    
    // Clean up interval
    return () => {
      clearInterval(streamCheckInterval);
    };
  }, [isModelLoaded]);
  
  // Watch videoRef.current.srcObject changes to update the face video
  useEffect(() => {
    const debugVideo = videoRef.current;
    if (debugVideo) {
      // Create a proxy object to detect when srcObject changes
      const originalSetter = Object.getOwnPropertyDescriptor(
        HTMLVideoElement.prototype, 'srcObject'
      )?.set;
      
      if (originalSetter) {
        Object.defineProperty(debugVideo, 'srcObject', {
          set(value) {
            originalSetter.call(this, value);
            console.log('Debug video srcObject changed, updating face video');
            
            // When debug video srcObject changes, update the face video too
            const faceVideo = document.getElementById('faceVideo') as HTMLVideoElement;
            if (faceVideo && value) {
              faceVideo.srcObject = value;
            }
          },
          get() {
            return this.getAttribute('srcObject');
          }
        });
      }
    }
  }, [videoRef.current]);

  // Initialize camera access on component mount
  useEffect(() => {
    // Function to request camera permissions explicitly before starting video
    const requestCameraPermission = async () => {
      try {
        // Try to get user media first to ensure permissions
        await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false 
        });
        console.log('Camera permission granted');
        return true;
      } catch (error) {
        console.error('Failed to get camera permission:', error);
        setCameraError("Kameraya icazə verilmədi. Zəhmət olmasa brauzerdə kamera icazələrini yoxlayın.");
        return false;
      }
    };

    // Only try to start video if permissions are granted and models are loaded
    const initCamera = async () => {
      if (await requestCameraPermission()) {
        if (isModelLoaded) {
          startVideo();
        }
      }
    };

    // Try to initialize camera
    initCamera();

    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [isModelLoaded]);
  
  // Sync detected face with Scene3D when a customer is recognized
  useEffect(() => {
    if (currentCustomer && detectedFaceImage) {
      // Make sure the face is visible in Scene3D
      setFaceDetected(true);
      setDetectedFace(detectedFaceImage);
    }
  }, [currentCustomer, detectedFaceImage]);

  // Handle detected face appearance in top right corner and send greeting
  useEffect(() => {
    // Only run this effect when face is first detected and visible and greeting hasn't been sent yet
    if (faceDetected && detectedFace && !isSpeaking && !isProcessing && !hasGreetingSent) {
      console.log('Face detected and visible in top right corner, sending greeting message');
      
      // Mark greeting as sent to prevent duplicates
      setHasGreetingSent(true);
      
      // Default greeting message
      const greetingMessage = "Salam. Sizə necə kömək edə bilərəm?";
      
      // Set processing state
      setIsProcessing(true);
      
      // Send greeting to webhook
      const webhookUrl = process.env.REACT_APP_WEBHOOK_URL;
      console.log('REACT_APP_WEBHOOK_URL is:', webhookUrl); // Debug log for webhook URL
      if (webhookUrl) {
        (async () => {
          try {
            // Send directly to the webhook URL without proxy
            console.log(`Sending greeting directly to webhook: ${webhookUrl}`);
            console.log('Complete webhook request details:', {
              url: webhookUrl,
              method: 'POST',
              body: {
                message: greetingMessage,
                timestamp: new Date().toISOString(),
                source: 'face_detection'
              }
            });
            
            // Send request to webhook
            const webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: greetingMessage,
                timestamp: new Date().toISOString(),
                source: 'face_detection'
              })
            });
            
            // Handle webhook response
            if (webhookResponse.ok) {
              console.log('Successfully sent greeting to webhook, processing response');
              
              // Set AI response in state
              setAiResponse(greetingMessage);
              
              // Reset processing state
              setIsProcessing(false);
              
              // Get audio response from webhook
              const audioBlob = await webhookResponse.blob();
              console.log('Received audio data from webhook for greeting');
              
              // Create audio URL
              const audioUrl = URL.createObjectURL(audioBlob);
              
              // Create audio element and play
              const audio = new Audio(audioUrl);
              audio.setAttribute('type', 'audio/aac');
              
              // Set speaking state to true during playback
              setIsSpeaking(true);
              
              // Set up playback completion
              audio.onended = () => {
                console.log("Greeting playback complete, activating microphone...");
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                
                // Start listening after greeting
                setTimeout(() => {
                  if (speechRecognitionRef.current) {
                    setIsListening(true);
                    speechRecognitionRef.current.startListening();
                    console.log('Started speech recognition after greeting');
                  }
                }, 500);
              };
              
              // Play greeting audio
              audio.play().catch(error => {
                console.error('Error playing greeting audio:', error);
                // Fallback to immediate microphone activation
                setIsSpeaking(false);
                setIsListening(true);
                if (speechRecognitionRef.current) {
                  speechRecognitionRef.current.startListening();
                }
              });
            } else {
              console.error('Failed to send greeting to webhook:', await webhookResponse.text());
              // Fallback to immediate microphone activation
              setIsProcessing(false);
              setIsListening(true);
              if (speechRecognitionRef.current) {
                speechRecognitionRef.current.startListening();
              }
            }
          } catch (webhookError) {
            console.error('Error sending greeting to webhook:', webhookError);
            // Fallback to immediate microphone activation
            setIsProcessing(false);
            setIsListening(true);
            if (speechRecognitionRef.current) {
              speechRecognitionRef.current.startListening();
            }
          }
        })();
      }
    }
  }, [faceDetected, detectedFace, isSpeaking, isProcessing, hasGreetingSent]);
  
  // Face detection interval with better tracking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isModelLoaded && videoRef.current && canvasRef.current && !currentCustomer) {
      // Get references to video and canvas elements
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Skip if we're speaking or processing
      if (isSpeaking || isProcessing) {
        console.log('Speaking or processing, pausing face detection');
        return;
      }
      
      console.log('Starting improved face detection interval');
      
      // Track face detection status for capture timing
      let faceDetectedFrames = 0;
      const FRAMES_BEFORE_CAPTURE = 5; // Wait for 5 consecutive frames with face before capturing
      
      // Run faster interval (100ms) for more responsive tracking
      interval = setInterval(async () => {
        // Skip if video is not fully loaded
        if (video.readyState < 4 || video.videoWidth === 0 || video.videoHeight === 0) {
          return;
        }
        
        try {
          // Resize canvas to match video dimensions
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
          }
          
          // Get canvas context for drawing
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          // Clear previous drawings
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Configure face detection for better accuracy
          const options = new faceapi.TinyFaceDetectorOptions({ 
            inputSize: 416, // Larger for better accuracy (must be multiple of 32)
            scoreThreshold: 0.5 // Minimum confidence
          });
          
          // Detect faces
          const results = await faceapi.detectAllFaces(video, options);
          
          if (results.length > 0) {
            // Face detected
            const detection = results[0];
            const box = detection.box;
            
            // No need to adjust coordinates as the canvas itself is mirrored with CSS
            // This keeps the detection math correct while the display handles the flipping
            
            // Add box size validation
            if (box.width < 40 || box.height < 40 || box.width/box.height > 2 || box.height/box.width > 2) {
              // Face size or ratio looks invalid
              faceDetectedFrames = 0;
              setIsFaceDetected(false);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              return;
            }
            
            // Increment face detection counter
            faceDetectedFrames++;
            
            // Set status to detected
            setIsFaceDetected(true);
            
            // Calculate animation effect
            const time = Date.now() / 1000;
            const pulseWidth = 3 + Math.sin(time * 4) * 1.5; 
            const pulseOpacity = 0.6 + Math.sin(time * 4) * 0.2;
            
            // Draw semi-transparent backdrop overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw frame highlight around face
            const padding = 15;
            
            // Clear face region
            ctx.clearRect(
              box.x - padding, 
              box.y - padding, 
              box.width + (padding * 2), 
              box.height + (padding * 2)
            );
            
            // Draw blue box around face
            ctx.strokeStyle = `rgba(0, 132, 255, ${pulseOpacity})`;
            ctx.lineWidth = pulseWidth;
            ctx.shadowColor = 'rgba(0, 132, 255, 0.8)';
            ctx.shadowBlur = 15;
            ctx.strokeRect(
              box.x - padding, 
              box.y - padding, 
              box.width + (padding * 2), 
              box.height + (padding * 2)
            );
            
            // Add label
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0, 132, 255, 0.8)';
            ctx.fillRect(box.x - padding, box.y - padding - 30, box.width + (padding * 2), 30);
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText('Üz aşkarlandı', box.x - padding + (box.width + padding * 2) / 2, box.y - padding - 10);
            
            // Add corner brackets for aesthetics
            const cornerSize = 20;
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
            ctx.lineWidth = pulseWidth + 1;
            
            // Draw corners (top-left, top-right, bottom-left, bottom-right)
            const drawCorner = (x: number, y: number, dirX: number, dirY: number) => {
              ctx.beginPath();
              ctx.moveTo(x, y + dirY * cornerSize);
              ctx.lineTo(x, y);
              ctx.lineTo(x + dirX * cornerSize, y);
              ctx.stroke();
            };
            
            // Top left
            drawCorner(box.x - padding, box.y - padding, 1, 1);
            // Top right
            drawCorner(box.x + box.width + padding, box.y - padding, -1, 1);
            // Bottom left
            drawCorner(box.x - padding, box.y + box.height + padding, 1, -1);
            // Bottom right
            drawCorner(box.x + box.width + padding, box.y + box.height + padding, -1, -1);
            
            // Only capture face if we've detected it for several consecutive frames
            if (faceDetectedFrames >= FRAMES_BEFORE_CAPTURE) {
              // Only capture once when we hit the threshold
              if (faceDetectedFrames === FRAMES_BEFORE_CAPTURE) {
                console.log('Face detected consistently, capturing...');
                
                // Create a temporary canvas to extract just the face region
                const tempCanvas = document.createElement('canvas');
                const facePadding = Math.round(Math.min(box.width, box.height) * 0.2); // 20% padding
                
                tempCanvas.width = box.width + (facePadding * 2);
                tempCanvas.height = box.height + (facePadding * 2);
                
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                  // Draw face with padding to temp canvas
                  tempCtx.drawImage(
                    video,
                    Math.max(0, box.x - facePadding),
                    Math.max(0, box.y - facePadding),
                    box.width + (facePadding * 2),
                    box.height + (facePadding * 2),
                    0, 0,
                    tempCanvas.width,
                    tempCanvas.height
                  );
                  
                  // Convert to data URL and update state
                  const faceImage = tempCanvas.toDataURL('image/jpeg', 0.92);
                  setDetectedFaceImage(faceImage);
                  
                  // Try to compute face descriptor and recognize customer
                  try {
                    const faceDescriptor = await faceapi.computeFaceDescriptor(video);
                    if (faceDescriptor) {
                      await recognizeCustomer(faceDescriptor as Float32Array, canvas);
                      
                      // Stop detection once customer is recognized
                      if (interval) {
                        clearInterval(interval);
                        interval = null;
                      }
                    }
                  } catch (descError) {
                    console.error('Error computing face descriptor:', descError);
                  }
                }
              }
            }
          } else {
            // No face detected
            faceDetectedFrames = 0;
            setIsFaceDetected(false);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Reset greeting state when face is lost
            if (hasGreetingSent) {
              console.log('Face lost, resetting greeting state');
              setHasGreetingSent(false);
            }
          }
        } catch (error) {
          console.error('Error in face detection cycle:', error);
        }
      }, 100); // 100ms for smoother tracking
      
      // Cleanup interval
      return () => {
        if (interval) {
          clearInterval(interval);
          console.log('Face detection interval cleared');
        }
      };
    }
  }, [isModelLoaded, currentCustomer, isSpeaking, isProcessing, recognizeCustomer, hasGreetingSent]);
  
  return (
    <div className="App">
      {/* Debug controls */}
      <div style={{ position: 'absolute', right: 10, bottom: 10, zIndex: 1000, display: 'flex', gap: '10px' }}>
        <button 
          onClick={triggerSpeechRecognition}
          style={{ 
            padding: '10px 15px', 
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Mikrofonu Aktivləşdir
        </button>
        
        <button 
          onClick={startVideo}
          style={{ 
            padding: '10px 15px', 
            background: '#00aa44',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Kameranı Aktivləşdir
        </button>
      </div>
      
      {/* Camera debug info */}
      <div style={{ position: 'absolute', left: 10, bottom: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', zIndex: 999, maxWidth: '300px', fontSize: '12px', borderRadius: '4px' }}>
        <p>Camera Status: {videoRef.current?.srcObject ? 'Active' : 'Inactive'}</p>
        <p>Camera Error: {cameraError || 'None'}</p>
        <p>Face Detected: {isFaceDetected ? 'Yes' : 'No'}</p>
        <p>Face Image: {detectedFaceImage ? 'Captured' : 'None'}</p>
      </div>
      
      {/* Main 3D Scene */}
      <Scene3D 
        isSpeaking={isSpeaking} 
        isListening={isListening} 
        lipSyncValue={lipSyncValue}
        isProcessing={isProcessing}
        detectedFace={detectedFace}
        isFaceDetected={faceDetected}
        errorMessage={cameraError}
      />
      
      {/* Hidden video element for debugging - needed for face detection but not visible to user */}
      <video 
        id="debugVideo"
        ref={videoRef}
        autoPlay 
        playsInline 
        muted
        style={{ 
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '320px',
          height: '240px'
        }}
        onLoadedMetadata={() => console.log('Debug video element loaded')}
      />
      
      {/* Speech Recognition */}
      <SpeechRecognition
        ref={speechRecognitionRef}
        onResult={handleSpeechResult}
        onListeningChange={handleListeningChange}
        onVolumeChange={handleVolumeChange}
        autoStart={false}
      />
      
      {/* Lip Sync */}
      <LipSync
        audioUrl={undefined}
        isPlaying={isSpeaking}
        onLipSyncValueChange={setLipSyncValue}
        onPlaybackComplete={handlePlaybackComplete}
      />
      
      {/* Interruption Handler */}
      <InterruptionHandler
        isSpeaking={isSpeaking}
        onInterrupt={handleInterruption}
      >
        {null}
      </InterruptionHandler>
      
      {/* Face recognition video - only shown when no customer is detected yet */}
      {isModelLoaded && !currentCustomer && (
      <div
        style={{ 
          position: 'absolute', 
            right: '50%',
            bottom: '20%',
            transform: 'translateX(50%)',
            width: '360px',
            height: '360px',
            opacity: isFaceDetected ? 0 : 1,
            visibility: isFaceDetected ? 'hidden' : 'visible',
            zIndex: 15,
            transition: 'all 0.8s ease-in-out',
          pointerEvents: 'none',
          border: '3px solid #0066cc',
            borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            background: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        <video 
            id="faceVideo"
          autoPlay
          playsInline
          muted
          style={{ 
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '10px',
            transform: 'scaleX(-1)'
            }}
            onPlay={() => console.log('Face video is playing')}
        />
        
        <canvas 
          ref={canvasRef} 
          width="360" 
          height="360" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '10px',
            zIndex: 16,
            backgroundColor: 'transparent',
            pointerEvents: 'none',
            transform: 'scaleX(-1)'
          }}
        />

          {/* Dark overlay when face is not detected */}
          {!isFaceDetected && (
            <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                zIndex: 17,
                borderRadius: '10px',
                padding: '20px'
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '15px' }}>
                Üzünüzü kameraya göstərin
              </div>
              {cameraError && (
        <div style={{
                  color: '#ff6666', 
                  fontSize: '16px', 
                  textAlign: 'center',
                  marginTop: '10px',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '5px',
                  maxWidth: '90%'
                }}>
                  {cameraError}
        </div>
              )}
      </div>
          )}
        </div>
      )}
      
      {/* Debug info - remove in production */}
      <div style={{ position: 'absolute', left: 10, top: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px' }}>
        <p>Speaking: {isSpeaking ? 'Yes' : 'No'}</p>
        <p>Listening: {isListening ? 'Yes' : 'No'}</p>
        <p>Processing: {isProcessing ? 'Yes' : 'No'}</p>
        <p>Face API Loaded: {isModelLoaded ? 'Yes' : 'No'}</p>
        <p>Customer ID: {currentCustomer?.id || 'None'}</p>
        <p>New customer: {isNewCustomer ? 'Yes' : 'No'}</p>
        <p>Sima User: {simaUserData ? `${simaUserData.firstName} ${simaUserData.lastName} (${simaUserData.sex})` : 'None'}</p>
        <p>Last speech: {userSpeech}</p>
        <p>Response: {aiResponse}</p>
      </div>
      
      {/* Chat Box */}
      <ChatBox
        messages={messages}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={handleSpeechResult}
        detectedText={detectedText}
        isSpeaking={isSpeaking}
        isListening={isListening}
        volume={volume}
      />
    </div>
  );
}

export default App;