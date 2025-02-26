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
    
    // Initialize direction pad
    setTimeout(initDirectionPad, 0); // Delay to ensure the canvas is rendered
    
    // Add Presets section LAST
    const { section: presetSection, content: presetContent } = createCollapsibleSection('Presets', false);
    sidebar.appendChild(presetSection);
    
    presetContent.innerHTML = `
        <button id="randomize">Randomize</button>
        <button id="preset1">Wavy Surface</button>
        <button id="preset2">Deep Cave</button>
        <button id="preset3">Alien Terrain</button>
        <button id="preset4">Plasma Warp</button>
        <button id="saveImage">Save as Image</button>
    `;
    
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
}

// Set up WebGL
function initWebGL() {
    try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) {
        console.error('Could not initialize WebGL:', e);
        displayError('WebGL initialization failed: ' + e.message);
        return;
    }
    
    if (!gl) {
        const errorMsg = 'Unable to initialize WebGL. Your browser may not support it.';
        alert(errorMsg);
        displayError(errorMsg);
        return;
    }
    
    // Add more explicit checking
    try {
        initShaders();
        initBuffers();
    } catch (e) {
        console.error('Error during setup:', e);
        displayError('Setup error: ' + e.message);
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

// Save canvas as an image
function saveCanvasAsImage() {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'shader-gradient-' + Date.now() + '.png';
    link.href = dataURL;
    link.click();
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

// Add this function to load presets
function loadPreset(settings) {
    // Update state with preset values
    Object.assign(state, settings);
    
    // Update UI to match preset
    document.getElementById('noiseType').value = state.noiseType;
    
    document.getElementById('amplitude').value = state.amplitude;
    document.getElementById('amplitudeValue').textContent = state.amplitude.toFixed(2);
    
    document.getElementById('frequency').value = state.frequency;
    document.getElementById('frequencyValue').textContent = state.frequency.toFixed(1);
    
    document.getElementById('speed').value = state.speed;
    document.getElementById('speedValue').textContent = state.speed.toFixed(2);
    
    document.getElementById('progress').value = state.progress;
    document.getElementById('progressValue').textContent = state.progress.toFixed(2);
    
    document.getElementById('color1').value = rgbToHex(state.color1);
    document.getElementById('color2').value = rgbToHex(state.color2);
    document.getElementById('color3').value = rgbToHex(state.color3);
    
    document.getElementById('enableDeform').checked = state.enableDeform;
    
    document.getElementById('deformAmount').value = state.deformAmount;
    document.getElementById('deformAmountValue').textContent = state.deformAmount.toFixed(2);
    
    document.getElementById('deformFrequency').value = state.deformFrequency;
    document.getElementById('deformFrequencyValue').textContent = state.deformFrequency.toFixed(1);
    
    document.getElementById('perspective').value = state.perspective;
    document.getElementById('perspectiveValue').textContent = state.perspective.toFixed(2);
    
    // Update colormap checkbox
    document.getElementById('useColorMap').checked = state.useColorMap;
    
    // Reinitialize shaders for the new noise type
    initShaders();
    
    // Render with new settings
    render();
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
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
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

// Add a direction pad control
function initDirectionPad() {
    const canvas = document.getElementById('directionPad');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    function drawPad() {
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
    
    function updateDirection(x, y) {
        // Convert to -1 to 1 range
        const dx = (x - centerX) / radius;
        const dy = (y - centerY) / radius;
        
        // Normalize if beyond unit circle
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 1) {
            state.directionX = dx / length;
            state.directionY = dy / length;
        } else {
            state.directionX = dx;
            state.directionY = dy;
        }
        
        // Update display
        document.getElementById('directionValue').textContent = 
            `X: ${state.directionX.toFixed(2)}, Y: ${state.directionY.toFixed(2)}`;
        
        // Redraw
        drawPad();
    }
    
    // Handle mouse/touch events
    function handleStart(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        updateDirection(x, y);
        
        function handleMove(e) {
            e.preventDefault();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            updateDirection(x, y);
        }
        
        function handleEnd() {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchend', handleEnd);
        }
        
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);
    }
    
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    
    // Initial draw
    drawPad();
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