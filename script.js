// Main application script
let gl;
let program;
let canvas;
let animationId = null;
let isAnimating = true;

// Current shader parameters
const state = {
    noiseType: 'cosine',
    amplitude: 1.0,
    frequency: 1.0,
    speed: 1.0,
    progress: 0,
    time: 0,
    color1: [1.0, 0.0, 0.0],  // Red
    color2: [0.0, 0.0, 1.0],  // Blue
    color3: [0.0, 1.0, 0.0],   // Green
    enableDeform: false,
    deformAmount: 0.1,
    deformFrequency: 1.0,
    perspective: 0.5,  // Perspective strength
    useColorMap: false,
    directionX: 1.0,
    directionY: 0.5,
    isAnimating: true,
    agentMode: false,
    agentSpeed: 0.01, // How fast the agent changes parameters
    agentTarget: {}, // Target values for the agent to move towards
    agentTimer: 0 // Timer for setting new targets
};

// Initialize WebGL when the page loads
window.onload = function() {
    // Get canvas first
    canvas = document.getElementById('shaderCanvas');
    
    // Initialize WebGL before setting up UI
    initWebGL();
    
    // Only set up UI if WebGL is working
    if (gl) {
        initUI();
        
        // Start animation by default since state.isAnimating is true
        if (state.isAnimating) {
            startAnimation();
        }
        
        render();
    }
};

// Creates a collapsible section with header and content
function createCollapsibleSection(title, isOpen = true) {
    const section = document.createElement('div');
    section.className = 'control-section';
    
    const header = document.createElement('div');
    header.className = 'section-header';
    
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = title;
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = isOpen ? 'toggle-icon' : 'toggle-icon collapsed';
    toggleIcon.textContent = '▼';
    
    header.appendChild(headerTitle);
    header.appendChild(toggleIcon);
    
    const content = document.createElement('div');
    content.className = isOpen ? 'section-content' : 'section-content collapsed';
    
    section.appendChild(header);
    section.appendChild(content);
    
    // Toggle collapse/expand on click
    header.addEventListener('click', function() {
        content.classList.toggle('collapsed');
        toggleIcon.classList.toggle('collapsed');
    });
    
    return { section, content };
}

// Set up UI controls
function initUI() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.innerHTML = ''; // Clear any existing content
    
    // Animation control at the top - FIRST SECTION
    const { section: animationSection, content: animationContent } = createCollapsibleSection('Animation', true);
    sidebar.appendChild(animationSection);
    
    // Add agent mode toggle
    const agentToggle = document.createElement('div');
    agentToggle.className = 'toggle-control';
    agentToggle.innerHTML = `
        <label for="agentMode">Agent Mode:</label>
        <input type="checkbox" id="agentMode" ${state.agentMode ? 'checked' : ''}>
    `;
    animationContent.appendChild(agentToggle);
    
    // Create animation controls
    const animateBtn = document.createElement('button');
    animateBtn.id = 'animate';
    animateBtn.textContent = isAnimating ? 'Stop Animation' : 'Start Animation';
    animateBtn.className = isAnimating ? 'active' : '';
    animationContent.appendChild(animateBtn);
    
    // Animation speed control
    const speedKnob = createKnob('speed', 'Speed', 0, 3, state.speed, 0.01, function(value) {
        state.speed = value;
    });
    animationContent.appendChild(speedKnob);
    
    // Agent speed control (visible when agent mode is enabled)
    const agentSpeedKnob = createKnob('agentSpeed', 'Agent Speed', 0.001, 0.1, state.agentSpeed, 0.001, function(value) {
        state.agentSpeed = value;
    });
    agentSpeedKnob.style.display = state.agentMode ? 'flex' : 'none';
    agentSpeedKnob.id = 'agentSpeedKnob';
    animationContent.appendChild(agentSpeedKnob);
    
    // Add Noise Type section SECOND
    const { section: noiseSection, content: noiseContent } = createCollapsibleSection('Noise Type', true);
    sidebar.appendChild(noiseSection);
    
    // Add noise type selection
    const noiseSelect = document.createElement('select');
    noiseSelect.id = 'noiseType';
    noiseSelect.innerHTML = `
        <option value="cosine">Cosine Waves</option>
        <option value="perlin">Perlin Noise</option>
        <option value="simplex">Simplex Noise</option>
        <option value="voronoi">Voronoi</option>
        <option value="fractal">Fractal Brownian Motion</option>
        <option value="warpFbm">Warp fBM Plasma</option>
    `;
    noiseSelect.value = state.noiseType;
    noiseContent.appendChild(noiseSelect);
    
    // Add Parameters section THIRD
    const { section: paramSection, content: paramContent } = createCollapsibleSection('Parameters', true);
    sidebar.appendChild(paramSection);
    
    // Add parameter knobs
    const knobGrid = document.createElement('div');
    knobGrid.className = 'knob-grid';
    paramContent.appendChild(knobGrid);
    
    // Add amplitude knob
    const amplitudeKnob = createKnob('amplitude', 'Amplitude', 0, 2, state.amplitude, 0.01, function(value) {
        state.amplitude = value;
    });
    knobGrid.appendChild(amplitudeKnob);
    
    // Add frequency knob
    const frequencyKnob = createKnob('frequency', 'Frequency', 0, 10, state.frequency, 0.1, function(value) {
        state.frequency = value;
    });
    knobGrid.appendChild(frequencyKnob);
    
    // Add progress knob
    const progressKnob = createKnob('progress', 'Progress', 0, 1, state.progress, 0.01, function(value) {
        state.progress = value;
    });
    knobGrid.appendChild(progressKnob);
    
    // Add Colors section FOURTH
    const { section: colorSection, content: colorContent } = createCollapsibleSection('Colors', true);
    sidebar.appendChild(colorSection);
    
    // Add color controls
    colorContent.innerHTML = `
        <div class="color-controls">
            <div class="color-input">
                <label for="color1">Color 1:</label>
                <input type="color" id="color1" value="${rgbToHex(state.color1)}">
            </div>
            <div class="color-input">
                <label for="color2">Color 2:</label>
                <input type="color" id="color2" value="${rgbToHex(state.color2)}">
            </div>
            <div class="color-input">
                <label for="color3">Color 3:</label>
                <input type="color" id="color3" value="${rgbToHex(state.color3)}">
            </div>
        </div>
        <div class="toggle-control">
            <label for="useColorMap">Plasma Color Map:</label>
            <input type="checkbox" id="useColorMap" ${state.useColorMap ? 'checked' : ''}>
        </div>
    `;
    
    // Add Deformation section FIFTH
    const { section: deformSection, content: deformContent } = createCollapsibleSection('Deformation', false);
    sidebar.appendChild(deformSection);
    
    deformContent.innerHTML = `
        <div class="toggle-control">
            <label for="enableDeform">Enable Deformation:</label>
            <input type="checkbox" id="enableDeform" ${state.enableDeform ? 'checked' : ''}>
        </div>
    `;
    
    // Add deformation knobs
    const deformKnobGrid = document.createElement('div');
    deformKnobGrid.className = 'knob-grid';
    deformContent.appendChild(deformKnobGrid);
    
    const deformAmountKnob = createKnob('deformAmount', 'Amount', 0, 1, state.deformAmount, 0.01, function(value) {
        state.deformAmount = value;
    });
    deformKnobGrid.appendChild(deformAmountKnob);
    
    const deformFreqKnob = createKnob('deformFrequency', 'Frequency', 0.1, 5, state.deformFrequency, 0.1, function(value) {
        state.deformFrequency = value;
    });
    deformKnobGrid.appendChild(deformFreqKnob);
    
    const perspectiveKnob = createKnob('perspective', 'Perspective', 0, 1, state.perspective, 0.01, function(value) {
        state.perspective = value;
    });
    deformKnobGrid.appendChild(perspectiveKnob);
    
    // Add Direction section SIXTH
    const { section: directionSection, content: directionContent } = createCollapsibleSection('Direction', false);
    sidebar.appendChild(directionSection);
    
    directionContent.innerHTML = `
        <div class="direction-control">
            <canvas id="directionPad" width="150" height="150"></canvas>
            <div id="directionValue">X: ${state.directionX.toFixed(2)}, Y: ${state.directionY.toFixed(2)}</div>
        </div>
    `;
    
    // Add event listener to initialize direction pad when the section is expanded
    directionSection.querySelector('.section-header').addEventListener('click', function() {
        const content = directionSection.querySelector('.section-content');
        if (!content.classList.contains('collapsed')) {
            setTimeout(initDirectionPad, 50); // Delay to ensure the canvas is rendered
        }
    });
    
    // Add Presets section LAST
    const { section: presetSection, content: presetContent } = createCollapsibleSection('Presets', false);
    sidebar.appendChild(presetSection);
    
    presetContent.innerHTML = `
        <button id="randomize">Randomize</button>
        <button id="preset1">Wavy Surface</button>
        <button id="preset2">Deep Cave</button>
        <button id="preset3">Alien Terrain</button>
        <button id="preset4">Plasma Warp</button>
    `;
    
    // Add save and export buttons outside of any collapsible section
    const saveButtonContainer = document.createElement('div');
    saveButtonContainer.className = 'save-button-container';
    
    const saveButton = document.createElement('button');
    saveButton.id = 'saveImage';
    saveButton.textContent = 'Save as Image';
    saveButtonContainer.appendChild(saveButton);
    
    const exportButton = document.createElement('button');
    exportButton.id = 'exportCode';
    exportButton.textContent = 'Export as HTML';
    exportButton.style.marginTop = '10px';
    saveButtonContainer.appendChild(exportButton);
    
    sidebar.appendChild(saveButtonContainer);
    
    // Add event listeners
    // Noise type selection
    document.getElementById('noiseType').addEventListener('change', function(e) {
        state.noiseType = e.target.value;
        initShaders(); // Recreate shaders when type changes
    });
    
    // Color controls
    document.getElementById('color1').addEventListener('input', function(e) {
        state.color1 = hexToRgb(e.target.value);
    });
    
    document.getElementById('color2').addEventListener('input', function(e) {
        state.color2 = hexToRgb(e.target.value);
    });
    
    document.getElementById('color3').addEventListener('input', function(e) {
        state.color3 = hexToRgb(e.target.value);
    });
    
    // Colormap toggle
    document.getElementById('useColorMap').addEventListener('change', function(e) {
        state.useColorMap = e.target.checked;
    });
    
    // Deformation controls
    document.getElementById('enableDeform').addEventListener('change', function(e) {
        state.enableDeform = e.target.checked;
    });
    
    // Animation control
    animateBtn.addEventListener('click', function() {
        toggleAnimation();
    });
    
    // Add event listeners for presets and other buttons
    // ... (existing event listeners for presets)
    
    // Start animation by default
    if (state.isAnimating) {
        startAnimation();
    }
    
    // Add event listeners
    document.getElementById('agentMode').addEventListener('change', function(e) {
        state.agentMode = e.target.checked;
        document.getElementById('agentSpeedKnob').style.display = state.agentMode ? 'flex' : 'none';
        
        if (state.agentMode) {
            // Initialize agent targets when enabling
            initAgentTargets();
        }
    });
    
    // Save image button
    document.getElementById('saveImage').addEventListener('click', saveCanvasAsImage);
    
    // Export button
    document.getElementById('exportCode').addEventListener('click', exportShaderCode);
    
    // Preset button listeners
    document.getElementById('preset1').addEventListener('click', function() {
        loadPreset({
            noiseType: 'cosine',
            amplitude: 1.2,
            frequency: 3.0,
            speed: 0.5,
            progress: 0.1,
            color1: [0.9, 0.1, 0.1], // Bright red
            color2: [0.1, 0.8, 0.9], // Light blue
            color3: [0.8, 0.8, 0.0], // Yellow
            enableDeform: true,
            deformAmount: 0.3,
            deformFrequency: 2.0,
            perspective: 0.5,
            directionX: 1.0,
            directionY: 0.5,
            useColorMap: false
        });
    });
    
    document.getElementById('preset2').addEventListener('click', function() {
        loadPreset({
            noiseType: 'fractal',
            amplitude: 0.8,
            frequency: 2.5,
            speed: 0.8,
            progress: 0.3,
            color1: [0.1, 0.1, 0.3], // Dark blue
            color2: [0.2, 0.4, 0.8], // Medium blue
            color3: [0.8, 0.9, 1.0], // Light blue
            enableDeform: true,
            deformAmount: 0.5,
            deformFrequency: 1.5,
            perspective: 0.7,
            directionX: 0.7,
            directionY: 0.3,
            useColorMap: false
        });
    });
    
    document.getElementById('preset3').addEventListener('click', function() {
        loadPreset({
            noiseType: 'voronoi',
            amplitude: 1.0,
            frequency: 4.0,
            speed: 0.4,
            progress: 0.5,
            color1: [0.1, 0.5, 0.1], // Dark green
            color2: [0.6, 0.3, 0.7], // Purple
            color3: [0.9, 0.8, 0.2], // Yellow
            enableDeform: true,
            deformAmount: 0.4,
            deformFrequency: 3.0,
            perspective: 0.4,
            directionX: 0.2,
            directionY: 0.8,
            useColorMap: false
        });
    });
    
    document.getElementById('preset4').addEventListener('click', function() {
        loadPreset({
            noiseType: 'warpFbm',
            amplitude: 1.5,
            frequency: 2.0,
            speed: 0.6,
            progress: 0.7,
            color1: [0.8, 0.2, 0.8], // Pink
            color2: [0.2, 0.8, 0.8], // Cyan
            color3: [0.8, 0.8, 0.2], // Yellow
            enableDeform: false,
            deformAmount: 0.0,
            deformFrequency: 1.0,
            perspective: 0.5,
            directionX: 0.5,
            directionY: 0.5,
            useColorMap: true
        });
    });
}

// Initialize WebGL
function initWebGL() {
    try {
        // Create WebGL context with preserveDrawingBuffer option
        gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) || 
             canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
            
        if (!gl) {
            console.error('WebGL not supported');
            showFallbackMessage();
            return;
        }
        
        // Initialize shaders
        initShaders();
        
        // Set up a full-screen quad
        initBuffers();
        
        // Set canvas size
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    } catch (e) {
        console.error('WebGL initialization failed:', e);
        showFallbackMessage();
    }
}

// Create and compile shaders
function initShaders() {
    // Create shader program
    const vertexShader = createShader(gl.VERTEX_SHADER, shaderLib.vertexShader);
    if (!vertexShader) return;
    
    // Get the appropriate fragment shader based on noise type
    let fragmentShaderCode;
    switch (state.noiseType) {
        case 'perlin':
            fragmentShaderCode = createFragmentShader(shaderLib.perlinShader);
            break;
        case 'simplex':
            fragmentShaderCode = createFragmentShader(shaderLib.simplexShader);
            break;
        case 'voronoi':
            fragmentShaderCode = createFragmentShader(shaderLib.voronoiShader);
            break;
        case 'fractal':
            fragmentShaderCode = createFragmentShader(shaderLib.fractalShader);
            break;
        case 'warpFbm':
            fragmentShaderCode = createFragmentShader(shaderLib.warpFbmShader);
            break;
        case 'cosine':
        default:
            fragmentShaderCode = createFragmentShader(shaderLib.cosineShader);
            break;
    }
    
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderCode);
    if (!fragmentShader) return;
    
    // Create and link the program
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        console.error('Unable to initialize the shader program:', error);
        displayError('Shader program linking failed. See console for details.');
        return;
    }
    
    gl.useProgram(program);
}

// Helper function to create and compile a shader
function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        console.error('An error occurred compiling the shaders:', error);
        displayError(`Shader compilation error: ${type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'} shader failed to compile. See console for details.`);
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// Set up vertex buffers for a full-screen quad
function initBuffers() {
    // Create position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    // Create a grid of vertices for better deformation
    const gridSize = 20; // Number of subdivisions in each direction
    const positions = [];
    const indices = [];
    
    // Create vertices
    for (let y = 0; y <= gridSize; y++) {
        for (let x = 0; x <= gridSize; x++) {
            // Convert from grid coordinates to clip space (-1 to 1)
            const xPos = (x / gridSize) * 2.0 - 1.0;
            const yPos = (y / gridSize) * 2.0 - 1.0;
            
            positions.push(xPos, yPos, 0.0);
        }
    }
    
    // Buffer the position data
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // Set up attribute pointer
    const positionAttributeLocation = gl.getAttribLocation(program, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    
    // Create index buffer for drawing the grid as triangles
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    
    // Create indices for triangles
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            // Calculate the indices of the quad's corners
            const topLeft = y * (gridSize + 1) + x;
            const topRight = topLeft + 1;
            const bottomLeft = (y + 1) * (gridSize + 1) + x;
            const bottomRight = bottomLeft + 1;
            
            // First triangle (top-left, bottom-left, bottom-right)
            indices.push(topLeft, bottomLeft, bottomRight);
            // Second triangle (top-left, bottom-right, top-right)
            indices.push(topLeft, bottomRight, topRight);
        }
    }
    
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    // Store the number of indices for drawing
    state.vertexCount = indices.length;
}

// Main render function
function render() {
    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Set uniforms
    setUniforms();
    
    // Draw the scene with elements
    gl.drawElements(gl.TRIANGLES, state.vertexCount, gl.UNSIGNED_SHORT, 0);
}

// Set shader uniform values
function setUniforms() {
    // Resolution
    const resolutionUniformLocation = gl.getUniformLocation(program, 'uResolution');
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    
    // Time
    const timeUniformLocation = gl.getUniformLocation(program, 'uTime');
    gl.uniform1f(timeUniformLocation, state.time);
    
    // Amplitude
    const amplitudeUniformLocation = gl.getUniformLocation(program, 'uAmplitude');
    gl.uniform1f(amplitudeUniformLocation, state.amplitude);
    
    // Frequency
    const frequencyUniformLocation = gl.getUniformLocation(program, 'uFrequency');
    gl.uniform1f(frequencyUniformLocation, state.frequency);
    
    // Progress
    const progressUniformLocation = gl.getUniformLocation(program, 'uProgress');
    gl.uniform1f(progressUniformLocation, state.progress);
    
    // Colors
    const color1UniformLocation = gl.getUniformLocation(program, 'uColor1');
    gl.uniform3fv(color1UniformLocation, state.color1);
    
    const color2UniformLocation = gl.getUniformLocation(program, 'uColor2');
    gl.uniform3fv(color2UniformLocation, state.color2);
    
    const color3UniformLocation = gl.getUniformLocation(program, 'uColor3');
    gl.uniform3fv(color3UniformLocation, state.color3);
    
    // Deformation uniforms
    const enableDeformLocation = gl.getUniformLocation(program, 'uEnableDeform');
    gl.uniform1i(enableDeformLocation, state.enableDeform ? 1 : 0);
    
    const deformAmountLocation = gl.getUniformLocation(program, 'uDeformAmount');
    gl.uniform1f(deformAmountLocation, state.deformAmount);
    
    const deformFrequencyLocation = gl.getUniformLocation(program, 'uDeformFrequency');
    gl.uniform1f(deformFrequencyLocation, state.deformFrequency);
    
    // Perspective uniform
    const perspectiveLocation = gl.getUniformLocation(program, 'uPerspective');
    gl.uniform1f(perspectiveLocation, state.perspective);
    
    // Add the colormap uniform
    const useColorMapLocation = gl.getUniformLocation(program, 'uUseColorMap');
    gl.uniform1i(useColorMapLocation, state.useColorMap ? 1 : 0);
    
    // Add direction uniform
    const directionLocation = gl.getUniformLocation(program, 'uDirection');
    gl.uniform2f(directionLocation, state.directionX, state.directionY);
}

// Animation loop
function animate() {
    // Update time for animation
    state.time += state.speed * 0.016 * 2.0;
    
    // Agent mode updates
    if (state.agentMode) {
        updateAgent();
    }
    
    render();
    animationId = requestAnimationFrame(animate);
}

// Handle canvas resizing
function resizeCanvas() {
    // Get the display size of the canvas
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    // Check if the canvas is not the same size
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        
        // Update the viewport only if gl is defined
        if (gl) {
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    }
}

// Randomize shader settings
function randomizeSettings() {
    // Randomize parameters
    state.amplitude = Math.random() * 1.5 + 0.5;
    state.frequency = Math.random() * 8.0 + 0.5;
    state.speed = Math.random() * 1.5 + 0.1;
    state.progress = Math.random();
    
    // Randomize colors
    state.color1 = [Math.random(), Math.random(), Math.random()];
    state.color2 = [Math.random(), Math.random(), Math.random()];
    state.color3 = [Math.random(), Math.random(), Math.random()];
    
    // Randomize deformation settings with a 50% chance of enabling it
    state.enableDeform = Math.random() > 0.5;
    state.deformAmount = Math.random() * 0.3 + 0.05;
    state.deformFrequency = Math.random() * 3.0 + 0.5;
    
    // Randomize perspective strength
    state.perspective = Math.random() * 0.5 + 0.25;
    
    // Randomize colormap usage (25% chance)
    state.useColorMap = Math.random() > 0.75;
    document.getElementById('useColorMap').checked = state.useColorMap;
    
    // Update UI to match the new values
    document.getElementById('amplitude').value = state.amplitude;
    document.getElementById('amplitudeValue').textContent = state.amplitude.toFixed(2);
    
    document.getElementById('frequency').value = state.frequency;
    document.getElementById('frequencyValue').textContent = state.frequency.toFixed(1);
    
    document.getElementById('speed').value = state.speed;
    document.getElementById('speedValue').textContent = state.speed.toFixed(2);
    
    document.getElementById('progress').value = state.progress;
    document.getElementById('progressValue').textContent = state.progress.toFixed(2);
    
    // Update color inputs
    document.getElementById('color1').value = rgbToHex(state.color1);
    document.getElementById('color2').value = rgbToHex(state.color2);
    document.getElementById('color3').value = rgbToHex(state.color3);
    
    // Update noiseTypes array to include the new type
    const noiseTypes = ['cosine', 'perlin', 'simplex', 'voronoi', 'fractal', 'warpFbm'];
    const randomType = noiseTypes[Math.floor(Math.random() * noiseTypes.length)];
    if (randomType !== state.noiseType) {
        state.noiseType = randomType;
        document.getElementById('noiseType').value = state.noiseType;
        initShaders();
    }
    
    // Update UI for deformation
    document.getElementById('enableDeform').checked = state.enableDeform;
    document.getElementById('deformAmount').value = state.deformAmount;
    document.getElementById('deformAmountValue').textContent = state.deformAmount.toFixed(2);
    document.getElementById('deformFrequency').value = state.deformFrequency;
    document.getElementById('deformFrequencyValue').textContent = state.deformFrequency.toFixed(1);
    
    // Update perspective strength
    document.getElementById('perspective').value = state.perspective;
    document.getElementById('perspectiveValue').textContent = state.perspective.toFixed(2);
    
    // Render with new settings
    render();
}

// Save canvas as an image using the simplest possible approach
function saveCanvasAsImage() {
    try {
        // Add visual feedback
        const saveBtn = document.getElementById('saveImage');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.style.backgroundColor = '#f38ba8';
        
        // Force a render to ensure we have the latest state
        render();
        
        // Use the canvas directly - this works because we set preserveDrawingBuffer: true
        const dataURL = canvas.toDataURL('image/png');
        
        // Create a download link
        const link = document.createElement('a');
        link.download = `noise_gradient_${state.noiseType}_${Date.now()}.png`;
        link.href = dataURL;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Reset the button
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.backgroundColor = '';
        }, 500);
    } catch (error) {
        console.error('Error saving image:', error);
        alert('Failed to save image. Error: ' + error.message);
    }
}

// Helper: Convert hex color to RGB array
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
}

// Helper: Convert RGB array to hex color
function rgbToHex(rgb) {
    const r = Math.floor(rgb[0] * 255).toString(16).padStart(2, '0');
    const g = Math.floor(rgb[1] * 255).toString(16).padStart(2, '0');
    const b = Math.floor(rgb[2] * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

// Add a function to display errors visibly on the canvas
function displayError(message) {
    const container = document.querySelector('.canvas-container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'webgl-error';
    errorDiv.innerHTML = `<p>${message}</p><p>Please check your browser's console for more details.</p>`;
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.right = '0';
    errorDiv.style.bottom = '0';
    errorDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '20px';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.display = 'flex';
    errorDiv.style.flexDirection = 'column';
    errorDiv.style.justifyContent = 'center';
    container.style.position = 'relative';
    container.appendChild(errorDiv);
}

// Update the loadPreset function to properly handle all state properties
function loadPreset(settings) {
    // Apply all settings to state
    for (const key in settings) {
        if (settings.hasOwnProperty(key)) {
            state[key] = settings[key];
        }
    }
    
    // Update UI to match the new values
    
    // Update noise type select
    const noiseSelect = document.getElementById('noiseType');
    if (noiseSelect) {
        noiseSelect.value = state.noiseType;
    }
    
    // Update color inputs
    document.getElementById('color1').value = rgbToHex(state.color1);
    document.getElementById('color2').value = rgbToHex(state.color2);
    document.getElementById('color3').value = rgbToHex(state.color3);
    
    // Update colormap checkbox
    document.getElementById('useColorMap').checked = state.useColorMap;
    
    // Update deformation controls
    document.getElementById('enableDeform').checked = state.enableDeform;
    
    // Update knob positions and values
    updateKnobUI('amplitude', state.amplitude);
    updateKnobUI('frequency', state.frequency);
    updateKnobUI('progress', state.progress);
    updateKnobUI('speed', state.speed);
    updateKnobUI('deformAmount', state.deformAmount);
    updateKnobUI('deformFrequency', state.deformFrequency);
    updateKnobUI('perspective', state.perspective);
    
    // Update direction control
    const directionValue = document.getElementById('directionValue');
    if (directionValue) {
        directionValue.textContent = `X: ${state.directionX.toFixed(2)}, Y: ${state.directionY.toFixed(2)}`;
    }
    
    // Refresh direction pad if it exists
    updateDirectionPad();
    
    // Reinitialize the shaders if noise type changed
    initShaders();
}

// Helper function to update knob UI
function updateKnobUI(id, value) {
    const knob = document.getElementById(id + '-knob');
    if (knob) {
        const min = parseFloat(knob.dataset.min);
        const max = parseFloat(knob.dataset.max);
        
        // Update rotation
        const angle = valueToAngle(value, min, max);
        knob.style.transform = `rotate(${angle}deg)`;
        
        // Update displayed value
        const valueEl = document.getElementById(id + '-value');
        if (valueEl) {
            const step = parseFloat(knob.dataset.step);
            valueEl.textContent = value.toFixed(step < 0.1 ? 2 : 1);
        }
    }
}

// Helper function to update direction pad
function updateDirectionPad() {
    const canvas = document.getElementById('directionPad');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#45475a';
    ctx.fill();
    ctx.strokeStyle = '#74c7ec';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw crosshair
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw direction line
    const dirX = centerX + state.directionX * radius;
    const dirY = centerY + state.directionY * radius;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(dirX, dirY);
    ctx.strokeStyle = '#f38ba8';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw handle
    ctx.beginPath();
    ctx.arc(dirX, dirY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f38ba8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Animation control
function toggleAnimation() {
    state.isAnimating = !state.isAnimating;
    isAnimating = state.isAnimating;
    
    // Update button text
    const animateBtn = document.getElementById('animate');
    animateBtn.textContent = isAnimating ? 'Stop Animation' : 'Start Animation';
    animateBtn.className = isAnimating ? 'active' : '';
    
    if (isAnimating) {
        startAnimation();
    } else {
        stopAnimation();
    }
}

function startAnimation() {
    if (!animationId) {
        animationId = requestAnimationFrame(animate);
    }
}

function stopAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Add this function for exporting the current shader setup
function exportShaderCode() {
    try {
        // Add visual feedback
        const exportBtn = document.getElementById('exportCode');
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'Exporting...';
        exportBtn.style.backgroundColor = '#74c7ec';
        
        // Get the vertex shader source
        const vertexShaderSource = shaderLib.vertexShader;
        
        // Get the fragment shader source based on the noise type
        let fragmentShaderSource;
        switch (state.noiseType) {
            case 'perlin':
                fragmentShaderSource = createFragmentShader(shaderLib.perlinShader);
                break;
            case 'simplex':
                fragmentShaderSource = createFragmentShader(shaderLib.simplexShader);
                break;
            case 'voronoi':
                fragmentShaderSource = createFragmentShader(shaderLib.voronoiShader);
                break;
            case 'fractal':
                fragmentShaderSource = createFragmentShader(shaderLib.fractalShader);
                break;
            case 'warpFbm':
                fragmentShaderSource = createFragmentShader(shaderLib.warpFbmShader);
                break;
            case 'cosine':
            default:
                fragmentShaderSource = createFragmentShader(shaderLib.cosineShader);
        }
        
        // Create a minimal HTML file with the current setup
        const exportCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Noise Gradient Shader</title>
    <style>
        body { margin: 0; overflow: hidden; background: #000; }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <canvas id="shaderCanvas"></canvas>
    
    <script>
        // Shader parameters
        const state = ${JSON.stringify({
            noiseType: state.noiseType,
            amplitude: state.amplitude,
            frequency: state.frequency,
            speed: state.speed,
            progress: state.progress,
            color1: state.color1,
            color2: state.color2,
            color3: state.color3,
            enableDeform: state.enableDeform,
            deformAmount: state.deformAmount,
            deformFrequency: state.deformFrequency,
            perspective: state.perspective,
            useColorMap: state.useColorMap,
            directionX: state.directionX,
            directionY: state.directionY
        }, null, 2)};
        
        // Initialize WebGL
        let gl, program, canvas, animationId;
        let time = 0;
        
        // Vertex shader
        const vertexShaderSource = \`${vertexShaderSource}\`;
        
        // Fragment shader
        const fragmentShaderSource = \`${fragmentShaderSource}\`;
        
        // Initialize when the page loads
        window.onload = function() {
            canvas = document.getElementById('shaderCanvas');
            initWebGL();
            if (gl) {
                setCanvasSize();
                window.addEventListener('resize', setCanvasSize);
                animate();
            }
        };
        
        // Set canvas size
        function setCanvasSize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        
        // Initialize WebGL
        function initWebGL() {
            gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                console.error('WebGL not supported');
                return;
            }
            
            // Create shaders
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vertexShaderSource);
            gl.compileShader(vertexShader);
            
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, fragmentShaderSource);
            gl.compileShader(fragmentShader);
            
            // Create program
            program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            gl.useProgram(program);
            
            // Create a quad covering the whole screen
            const positions = new Float32Array([
                -1.0, -1.0,
                 1.0, -1.0,
                -1.0,  1.0,
                 1.0,  1.0
            ]);
            
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            
            const positionLocation = gl.getAttribLocation(program, 'aVertexPosition');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        }
        
        // Animation loop
        function animate() {
            time += state.speed * 0.016;
            render();
            animationId = requestAnimationFrame(animate);
        }
        
        // Render frame
        function render() {
            // Set uniforms
            const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            
            const timeLocation = gl.getUniformLocation(program, 'uTime');
            gl.uniform1f(timeLocation, time);
            
            const amplitudeLocation = gl.getUniformLocation(program, 'uAmplitude');
            gl.uniform1f(amplitudeLocation, state.amplitude);
            
            const frequencyLocation = gl.getUniformLocation(program, 'uFrequency');
            gl.uniform1f(frequencyLocation, state.frequency);
            
            const progressLocation = gl.getUniformLocation(program, 'uProgress');
            gl.uniform1f(progressLocation, state.progress);
            
            const color1Location = gl.getUniformLocation(program, 'uColor1');
            gl.uniform3fv(color1Location, state.color1);
            
            const color2Location = gl.getUniformLocation(program, 'uColor2');
            gl.uniform3fv(color2Location, state.color2);
            
            const color3Location = gl.getUniformLocation(program, 'uColor3');
            gl.uniform3fv(color3Location, state.color3);
            
            const deformAmountLocation = gl.getUniformLocation(program, 'uDeformAmount');
            gl.uniform1f(deformAmountLocation, state.deformAmount);
            
            const deformFrequencyLocation = gl.getUniformLocation(program, 'uDeformFrequency');
            gl.uniform1f(deformFrequencyLocation, state.deformFrequency);
            
            const enableDeformLocation = gl.getUniformLocation(program, 'uEnableDeform');
            gl.uniform1i(enableDeformLocation, state.enableDeform ? 1 : 0);
            
            const useColorMapLocation = gl.getUniformLocation(program, 'uUseColorMap');
            gl.uniform1i(useColorMapLocation, state.useColorMap ? 1 : 0);
            
            const directionLocation = gl.getUniformLocation(program, 'uDirection');
            gl.uniform2f(directionLocation, state.directionX, state.directionY);
            
            // Draw the quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    </script>
</body>
</html>`;
        
        // Create a download link
        const blob = new Blob([exportCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `noise_gradient_${state.noiseType}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Reset the button
        setTimeout(() => {
            exportBtn.textContent = originalText;
            exportBtn.style.backgroundColor = '';
        }, 500);
    } catch (error) {
        console.error('Error exporting code:', error);
        alert('Failed to export code. Error: ' + error.message);
    }
}

// Initialize random targets for the agent to move towards
function initAgentTargets() {
    // Create random targets within valid ranges
    state.agentTarget = {
        amplitude: Math.random() * 2,
        frequency: Math.random() * 10,
        progress: Math.random(),
        directionX: Math.random() * 2 - 1,
        directionY: Math.random() * 2 - 1,
        deformAmount: Math.random(),
        deformFrequency: Math.random() * 5,
        perspective: Math.random(),
        // Color targets
        color1: [Math.random(), Math.random(), Math.random()],
        color2: [Math.random(), Math.random(), Math.random()],
        color3: [Math.random(), Math.random(), Math.random()]
    };
    
    // Normalize direction vector
    const length = Math.sqrt(
        state.agentTarget.directionX * state.agentTarget.directionX + 
        state.agentTarget.directionY * state.agentTarget.directionY
    );
    if (length > 0) {
        state.agentTarget.directionX /= length;
        state.agentTarget.directionY /= length;
    }
    
    // Reset timer
    state.agentTimer = 0;
}

// Linear interpolation helper
function lerp(start, end, t) {
    if (Array.isArray(start)) {
        return start.map((val, idx) => lerp(val, end[idx], t));
    }
    return start + (end - start) * t;
}

// Update agent parameters
function updateAgent() {
    // Increment agent timer
    state.agentTimer += state.agentSpeed;
    
    // Set new targets periodically
    if (state.agentTimer > 1) {
        initAgentTargets();
        
        // Random chance to change noise type
        if (Math.random() < 0.2) {
            const noiseTypes = ['cosine', 'perlin', 'simplex', 'voronoi', 'fractal', 'warpFbm'];
            const newNoiseType = noiseTypes[Math.floor(Math.random() * noiseTypes.length)];
            
            if (newNoiseType !== state.noiseType) {
                state.noiseType = newNoiseType;
                document.getElementById('noiseType').value = state.noiseType;
                initShaders();
            }
        }
        
        // Random chance to toggle deformation
        if (Math.random() < 0.3) {
            state.enableDeform = !state.enableDeform;
            document.getElementById('enableDeform').checked = state.enableDeform;
        }
        
        // Random chance to toggle color map
        if (Math.random() < 0.3) {
            state.useColorMap = !state.useColorMap;
            document.getElementById('useColorMap').checked = state.useColorMap;
        }
    }
    
    // Interpolate between current values and target values
    const t = Math.min(state.agentSpeed * 10, 0.05); // How quickly to move toward targets
    
    state.amplitude = lerp(state.amplitude, state.agentTarget.amplitude, t);
    state.frequency = lerp(state.frequency, state.agentTarget.frequency, t);
    state.progress = lerp(state.progress, state.agentTarget.progress, t);
    state.directionX = lerp(state.directionX, state.agentTarget.directionX, t);
    state.directionY = lerp(state.directionY, state.agentTarget.directionY, t);
    
    if (state.enableDeform) {
        state.deformAmount = lerp(state.deformAmount, state.agentTarget.deformAmount, t);
        state.deformFrequency = lerp(state.deformFrequency, state.agentTarget.deformFrequency, t);
        state.perspective = lerp(state.perspective, state.agentTarget.perspective, t);
    }
    
    state.color1 = lerp(state.color1, state.agentTarget.color1, t);
    state.color2 = lerp(state.color2, state.agentTarget.color2, t);
    state.color3 = lerp(state.color3, state.agentTarget.color3, t);
    
    // Update UI occasionally to reflect current values
    if (Math.random() < 0.05) {
        updateAgentUI();
    }
}

// Update UI to reflect agent-controlled parameters
function updateAgentUI() {
    // Update color inputs
    document.getElementById('color1').value = rgbToHex(state.color1);
    document.getElementById('color2').value = rgbToHex(state.color2);
    document.getElementById('color3').value = rgbToHex(state.color3);
    
    // Update knobs
    updateKnobUI('amplitude', state.amplitude);
    updateKnobUI('frequency', state.frequency);
    updateKnobUI('progress', state.progress);
    updateKnobUI('deformAmount', state.deformAmount);
    updateKnobUI('deformFrequency', state.deformFrequency);
    updateKnobUI('perspective', state.perspective);
    
    // Update direction pad
    const directionValue = document.getElementById('directionValue');
    if (directionValue) {
        directionValue.textContent = `X: ${state.directionX.toFixed(2)}, Y: ${state.directionY.toFixed(2)}`;
    }
    
    // Update direction pad visual occasionally
    if (Math.random() > 0.7) {
        updateDirectionPad();
    }
}

// Create a knob element and add it to the DOM
function createKnob(id, label, min, max, value, step, onChange) {
    const container = document.createElement('div');
    container.className = 'knob-container';
    
    const knob = document.createElement('div');
    knob.className = 'knob';
    knob.id = id + '-knob';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'knob-label';
    labelEl.textContent = label;
    
    const valueEl = document.createElement('div');
    valueEl.className = 'knob-value';
    valueEl.id = id + '-value';
    valueEl.textContent = value.toFixed(step < 0.1 ? 2 : 1);
    
    container.appendChild(knob);
    container.appendChild(labelEl);
    container.appendChild(valueEl);
    
    // Store the knob data
    knob.dataset.min = min;
    knob.dataset.max = max;
    knob.dataset.value = value;
    knob.dataset.step = step;
    
    // Set initial rotation
    const angle = valueToAngle(value, min, max);
    knob.style.transform = `rotate(${angle}deg)`;
    
    // Add event listeners
    knob.addEventListener('mousedown', handleKnobInteraction);
    knob.addEventListener('touchstart', handleKnobInteraction, { passive: false });
    
    // Store the callback
    knob.dataset.callback = id;
    knobCallbacks[id] = onChange;
    
    return container;
}

// Convert a value to an angle (0-270 degrees)
function valueToAngle(value, min, max) {
    return ((value - min) / (max - min)) * 270 - 135;
}

// Convert an angle to a value
function angleToValue(angle, min, max, step) {
    // Normalize angle to 0-270 range
    angle = (angle + 135) % 360;
    if (angle < 0) angle += 360;
    if (angle > 270) angle = 270;
    
    // Convert to value
    let value = min + (angle / 270) * (max - min);
    
    // Round to step
    value = Math.round(value / step) * step;
    return Math.min(Math.max(min, value), max);
}

// Store callbacks for knobs
const knobCallbacks = {};

// Handle knob interaction
function handleKnobInteraction(e) {
    e.preventDefault();
    
    const knob = e.target;
    const min = parseFloat(knob.dataset.min);
    const max = parseFloat(knob.dataset.max);
    const step = parseFloat(knob.dataset.step);
    const callback = knob.dataset.callback;
    
    const knobRect = knob.getBoundingClientRect();
    const knobCenterX = knobRect.left + knobRect.width / 2;
    const knobCenterY = knobRect.top + knobRect.height / 2;
    
    function moveHandler(e) {
        // Get mouse/touch position
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        // Calculate angle
        const deltaX = clientX - knobCenterX;
        const deltaY = clientY - knobCenterY;
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
        
        // Convert angle to value
        const value = angleToValue(angle, min, max, step);
        
        // Update knob rotation
        knob.style.transform = `rotate(${valueToAngle(value, min, max)}deg)`;
        
        // Update value display
        document.getElementById(callback + '-value').textContent = value.toFixed(step < 0.1 ? 2 : 1);
        
        // Store the value
        knob.dataset.value = value;
        
        // Call the callback
        if (knobCallbacks[callback]) {
            knobCallbacks[callback](value);
        }
    }
    
    function upHandler() {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        document.removeEventListener('touchend', upHandler);
    }
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('touchend', upHandler);
    
    // Initial position
    moveHandler(e);
} 