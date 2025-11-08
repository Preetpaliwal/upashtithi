var labels = [];
let detectedFaces = [];
let sendingData = false;
let webcamStarted = false;
let modelsLoaded = false;
let videoStream = null;
let faceRecognitionInitialized = false;

// Define handleStartButtonClick early so it's available for inline onclick
window.handleStartButtonClick = function() {
  console.log("Launch button clicked");
  
  const selectedCourseID = document.getElementById("courseSelect")?.value;
  const selectedUnitCode = document.getElementById("unitSelect")?.value;
  const selectedVenue = document.getElementById("venueSelect")?.value;

  console.log("Selections:", { selectedCourseID, selectedUnitCode, selectedVenue });

  // Validate all selections are made
  if (!selectedCourseID || !selectedUnitCode || !selectedVenue) {
    alert("Please select course, unit, and venue before launching face recognition.");
    return;
  }

  // Check if labels are loaded - CRITICAL for face recognition to work
  console.log("Current labels array:", labels);
  if (!labels || labels.length === 0) {
    alert("No student data loaded. Please wait for the student table to load after selecting course, unit, and venue. If the table is empty, there are no students enrolled for this selection.");
    return;
  }

  const video = document.getElementById("video");
  const videoContainer = document.querySelector(".video-container");
  
  if (!video) {
    console.error("Video element not found");
    alert("Video element not found. Please refresh the page.");
    return;
  }
  
  if (!videoContainer) {
    console.error("Video container not found");
    alert("Video container not found. Please refresh the page.");
    return;
  }

  console.log("Video elements found, showing container");
  videoContainer.style.display = "flex";
  
  // Check if models are loaded
  if (!modelsLoaded) {
    console.warn("Models not loaded yet, will try anyway");
    alert("Face recognition models are still loading. Camera will open, but recognition may not work immediately.");
  }
  
  if (!webcamStarted) {
    console.log("Starting webcam...");
    startWebcam(video, videoContainer);
  } else {
    console.log("Webcam already started");
  }
};

// Also create a reference for backwards compatibility
var handleStartButtonClick = window.handleStartButtonClick;

// Initialize face recognition setup when DOM is ready
function waitForFaceAPI() {
  if (typeof faceapi !== 'undefined') {
    initializeFaceRecognition();
  } else {
    // Wait for face-api.js to load
    setTimeout(waitForFaceAPI, 100);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForFaceAPI);
} else {
  // DOM already loaded
  waitForFaceAPI();
}

function initializeFaceRecognition() {
  const startButton = document.getElementById("startButton");
  if (!startButton) {
    // Retry if button not found yet
    setTimeout(initializeFaceRecognition, 100);
    return;
  }

  // Load models early
  Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri("models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("models"),
  ])
    .then(() => {
      modelsLoaded = true;
      console.log("models loaded successfully");
    })
    .catch((error) => {
      console.error("Error loading models:", error);
      alert("models not loaded, please check your model folder location");
    });

  // Attach event listener once
  if (!faceRecognitionInitialized) {
    startButton.addEventListener("click", handleStartButtonClick);
    faceRecognitionInitialized = true;
    console.log("Event listener attached to startButton");
  } else {
    console.log("Event listener already attached");
  }
}


function updateTable() {
  var selectedCourseID = document.getElementById("courseSelect").value;
  var selectedUnitCode = document.getElementById("unitSelect").value;
  var selectedVenue = document.getElementById("venueSelect").value;
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "resources/pages/lecture/manageFolder.php", true);
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          var response = JSON.parse(xhr.responseText);
          if (response.status === "success") {
            labels = response.data || [];
            console.log("Labels loaded successfully:", labels);
            console.log("Number of students:", labels.length);

            if (selectedCourseID && selectedUnitCode && selectedVenue) {
              updateOtherElements();
            }
            document.getElementById("studentTableContainer").innerHTML =
              response.html || "";
          } else {
            // Don't show error for "No records found" - this is expected when no students are enrolled
            if (response.message && response.message !== "No records found") {
              console.error("Error:", response.message);
            }
            labels = [];
            console.warn("No labels loaded - no students found");
            document.getElementById("studentTableContainer").innerHTML = 
              response.html || "<p>No students found for the selected course, unit, and venue.</p>";
          }
        } catch (e) {
          console.error("Error parsing response:", e);
          console.error("Response text:", xhr.responseText);
          labels = [];
        }
      } else {
        console.error("HTTP Error:", xhr.status, xhr.statusText);
        labels = [];
      }
    }
  };
  xhr.send(
    "courseID=" +
      encodeURIComponent(selectedCourseID) +
      "&unitID=" +
      encodeURIComponent(selectedUnitCode) +
      "&venueID=" +
      encodeURIComponent(selectedVenue)
  );
}

function markAttendance(detectedFaces) {
  console.log("Marking attendance for detected faces:", detectedFaces);
  
  document.querySelectorAll("#studentTableContainer tr").forEach((row) => {
    // Skip header row if present
    if (row.cells.length < 6) return;
    
    const registrationNumber = row.cells[0].innerText.trim();
    const attendanceCell = row.cells[5];
    
    if (!attendanceCell) {
      console.warn("Attendance cell not found for row");
      return;
    }
    
    // Check if this registration number is in detected faces
    // The detectedFaces array contains labels from face recognition
    const isDetected = detectedFaces.some(faceLabel => {
      // Handle case where label might be "unknown" or similar
      if (!faceLabel || faceLabel === "unknown") return false;
      
      // Exact match or normalized match
      const normalizedLabel = faceLabel.trim().toLowerCase();
      const normalizedReg = registrationNumber.trim().toLowerCase();
      
      return normalizedLabel === normalizedReg || faceLabel.includes(registrationNumber);
    });
    
    if (isDetected) {
      attendanceCell.innerText = "Present";
      attendanceCell.style.color = "green";
      attendanceCell.style.fontWeight = "bold";
      console.log("Marked as present:", registrationNumber);
    } else {
      // Only set to absent if it hasn't been marked present yet
      if (attendanceCell.innerText.toLowerCase() !== "present" && attendanceCell.innerText !== "Present") {
        attendanceCell.innerText = "Absent";
        attendanceCell.style.color = "red";
      }
    }
  });
}

function startWebcam(video, videoContainer) {
  console.log("Attempting to access webcam...");
  
  // Check if getUserMedia is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("getUserMedia is not supported in this browser");
    alert("Camera access is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false,
    })
    .then((stream) => {
      console.log("Webcam access granted");
      video.srcObject = stream;
      videoStream = stream;
      webcamStarted = true;
      
      // Setup face recognition when video starts playing (before play)
      // Use loadedmetadata to ensure video is ready
      const setupOnReady = () => {
        console.log("Video ready, setting up face recognition");
        setupFaceRecognition();
      };
      
      // Try multiple events to ensure we catch when video is ready
      video.addEventListener("loadedmetadata", setupOnReady, { once: true });
      video.addEventListener("playing", setupOnReady, { once: true });
      
      // Make sure video plays - but handle if it's already playing
      if (video.paused) {
        video.play().then(() => {
          console.log("Video started playing");
        }).catch((error) => {
          // If error is AbortError, video might already be playing - that's okay
          if (error.name !== 'AbortError') {
            console.error("Error playing video:", error);
          } else {
            console.log("Video play was interrupted (may already be playing)");
          }
        });
      } else {
        console.log("Video already playing, setting up recognition");
        setupFaceRecognition();
      }
    })
    .catch((error) => {
      console.error("Error accessing webcam:", error);
      webcamStarted = false;
      
      let errorMessage = "Unable to access webcam. ";
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += "Please allow camera access in your browser settings and try again.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += "No camera found. Please connect a camera and try again.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += "Camera is being used by another application. Please close other apps using the camera.";
      } else {
        errorMessage += "Error: " + error.message;
      }
      
      alert(errorMessage);
      
      // Hide video container if webcam fails
      if (videoContainer) {
        videoContainer.style.display = "none";
      }
    });
}

async function getLabeledFaceDescriptions() {
  const labeledDescriptors = [];
  detectedFaces = []; // Reset detected faces

  console.log("Loading face descriptors for labels:", labels);
  console.log("Number of labels to process:", labels.length);

  // Validate labels array is not empty
  if (!labels || labels.length === 0) {
    console.error("ERROR: Labels array is empty! Cannot load face descriptors.");
    alert("No student registration numbers loaded. Please make sure:\n1. Course, unit, and venue are selected\n2. Students are enrolled for this selection\n3. Student table is loaded successfully");
    return labeledDescriptors;
  }

  for (const label of labels) {
    if (!label) continue; // Skip empty labels
    
    const descriptions = [];
    const registrationNumber = label.trim(); // Ensure we use the registration number as-is

    console.log(`Processing registration number: ${registrationNumber}`);

    for (let i = 1; i <= 5; i++) {
      try {
        const imagePath = `resources/labels/${registrationNumber}/${i}.png`;
        console.log(`Loading image: ${imagePath}`);
        
        const img = await faceapi.fetchImage(imagePath);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          descriptions.push(detections.descriptor);
          console.log(`✓ Loaded descriptor ${i}/5 for ${registrationNumber}`);
        } else {
          console.log(`✗ No face detected in ${registrationNumber}/${i}.png`);
        }
      } catch (error) {
        console.error(`✗ Error processing ${registrationNumber}/${i}.png:`, error.message);
        // Continue with next image even if one fails
      }
    }

    if (descriptions.length > 0) {
      labeledDescriptors.push(
        new faceapi.LabeledFaceDescriptors(registrationNumber, descriptions)
      );
      console.log(`✓ Successfully loaded ${descriptions.length} descriptors for ${registrationNumber}`);
    } else {
      console.warn(`✗ No descriptors loaded for ${registrationNumber} - check if images exist in resources/labels/${registrationNumber}/`);
    }
  }

  console.log(`Total labeled descriptors loaded: ${labeledDescriptors.length} out of ${labels.length} students`);
  
  if (labeledDescriptors.length === 0) {
    console.error("CRITICAL: No face descriptors were loaded! Face recognition will not work.");
    alert("No face images found for students. Please ensure:\n1. Face images are stored in resources/labels/[RegistrationNumber]/1.png through 5.png\n2. Images contain clear face photos\n3. Registration numbers match exactly");
  }
  
  return labeledDescriptors;
}

let faceRecognitionSetupInProgress = false;

async function setupFaceRecognition() {
  // Prevent multiple simultaneous setups
  if (faceRecognitionSetupInProgress) {
    console.log("Face recognition setup already in progress, skipping...");
    return;
  }
  
  faceRecognitionSetupInProgress = true;
  
  const video = document.getElementById("video");
  const videoContainer = document.querySelector(".video-container");
  
  if (!video || !videoContainer) {
    console.error("Video or container not found");
    faceRecognitionSetupInProgress = false;
    return;
  }

  console.log("Setting up face recognition...");
  console.log("Current labels before loading descriptors:", labels);

  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  if (labeledFaceDescriptors.length === 0) {
    console.warn("No face descriptors loaded - face recognition will not work");
    faceRecognitionSetupInProgress = false;
    alert("Cannot start face recognition: No student face images found. Please ensure face images are uploaded for students.");
    return;
  }
  
  faceRecognitionSetupInProgress = false;

  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

  // Remove existing canvas if any
  const existingCanvas = videoContainer.querySelector("canvas");
  if (existingCanvas) {
    existingCanvas.remove();
  }

  const canvas = faceapi.createCanvasFromMedia(video);
  videoContainer.appendChild(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    const results = resizedDetections.map((d) => {
      return faceMatcher.findBestMatch(d.descriptor);
    });
    
    // Extract labels, filtering out "unknown" faces and only including confident matches
    detectedFaces = results
      .filter(result => {
        // Only include if distance is low (high confidence) and not "unknown"
        return result.label !== "unknown" && result.distance < 0.6;
      })
      .map((result) => result.label);
    
    console.log("Detected faces:", detectedFaces);
    markAttendance(detectedFaces);

    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: result,
      });
      drawBox.draw(canvas);
    });
  }, 100);
}

function updateOtherElements() {
  // This function can be used for any additional setup if needed
  // The main initialization is now handled by initializeFaceRecognition()
}

function sendAttendanceDataToServer() {
  const attendanceData = [];

  document
    .querySelectorAll("#studentTableContainer tr")
    .forEach((row, index) => {
      if (index === 0) return;
      const studentID = row.cells[0].innerText.trim();
      const course = row.cells[2].innerText.trim();
      const unit = row.cells[3].innerText.trim();
      const attendanceStatus = row.cells[5].innerText.trim();

      attendanceData.push({ studentID, course, unit, attendanceStatus });
    });

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "handle_attendance", true);
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);

          if (response.status === "success") {
            showMessage(
              response.message || "Attendance recorded successfully."
            );
          } else {
            showMessage(
              response.message ||
                "An error occurred while recording attendance."
            );
          }
        } catch (e) {
          showMessage("Error: Failed to parse the response from the server.");
          console.error(e);
        }
      } else {
        showMessage(
          "Error: Unable to record attendance. HTTP Status: " + xhr.status
        );
        console.error("HTTP Error", xhr.status, xhr.statusText);
      }
    }
  };

  xhr.send(JSON.stringify(attendanceData));
}
function showMessage(message) {
  var messageDiv = document.getElementById("messageDiv");
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  console.log(message);
  messageDiv.style.opacity = 1;
  setTimeout(function () {
    messageDiv.style.opacity = 0;
  }, 5000);
}
function stopWebcam() {
  if (videoStream) {
    const tracks = videoStream.getTracks();

    tracks.forEach((track) => {
      track.stop();
    });

    const video = document.getElementById("video");
    if (video) {
      video.srcObject = null;
    }
    videoStream = null;
    webcamStarted = false;
  }
}

// Make endAttendance handler globally accessible
window.handleEndAttendance = function() {
  console.log("END Attendance button clicked");
  sendAttendanceDataToServer();
  const videoContainer = document.querySelector(".video-container");
  if (videoContainer) {
    videoContainer.style.display = "none";
  }
  stopWebcam();
};

// Initialize endAttendance button listener when DOM is ready
function initializeEndAttendanceButton() {
  const endAttendanceBtn = document.getElementById("endAttendance");
  if (endAttendanceBtn) {
    // Remove any existing listeners by cloning
    const newBtn = endAttendanceBtn.cloneNode(true);
    endAttendanceBtn.parentNode.replaceChild(newBtn, endAttendanceBtn);
    
    newBtn.addEventListener("click", window.handleEndAttendance);
    console.log("END Attendance button listener attached");
  } else {
    // Retry if button not found yet
    setTimeout(initializeEndAttendanceButton, 100);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEndAttendanceButton);
} else {
  // DOM already loaded
  initializeEndAttendanceButton();
}

