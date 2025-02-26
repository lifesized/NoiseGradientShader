// Collection of shader code
const shaderLib = {
    // Vertex shader - simple pass-through
    vertexShader: `
        attribute vec4 aVertexPosition;
        
        uniform float uTime;
        uniform float uDeformAmount;
        uniform float uDeformFrequency;
        uniform bool uEnableDeform;
        
        // Hash function for pseudo-random values
        float hash(float n) {
            return fract(sin(n) * 43758.5453);
        }
        
        // Simple Perlin noise for vertex deformation
        float perlin2D(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            
            float a = hash(i.x + i.y * 57.0);
            float b = hash(i.x + 1.0 + i.y * 57.0);
            float c = hash(i.x + i.y * 57.0 + 57.0);
            float d = hash(i.x + 1.0 + i.y * 57.0 + 57.0);
            
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) + 
                (c - a) * u.y * (1.0 - u.x) + 
                (d - b) * u.x * u.y;
        }
        
        void main() {
            vec4 position = aVertexPosition;
            
            if (uEnableDeform) {
                // Apply deformation based on noise
                float noise = perlin2D((position.xy + vec2(0.0, 1.0)) * uDeformFrequency + uTime * 0.1);
                position.z += noise * uDeformAmount;
            }
            
            gl_Position = position;
        }
    `,
    
    // Base fragment shader with shared functions
    fragmentShaderBase: `
        precision highp float;
        
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uFrequency;
        uniform float uProgress;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform bool uUseColorMap;
        uniform vec2 uDirection; // Direction vector for movement
        
        // Hash function for pseudo-random values
        float hash(float n) {
            return fract(sin(n) * 43758.5453);
        }
        
        // 2D hash
        vec2 hash2(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return fract(sin(p) * 43758.5453);
        }
        
        // Smooth interpolation
        float smooth_mix(float a, float b, float t) {
            return a + (b - a) * (3.0 - 2.0 * t) * t * t;
        }
        
        // Mix three colors based on a value
        vec3 tricolor_mix(float value) {
            float v = clamp(value, 0.0, 1.0);
            vec3 color;
            if (v < 0.5) {
                color = mix(uColor1, uColor2, v * 2.0);
            } else {
                color = mix(uColor2, uColor3, (v - 0.5) * 2.0);
            }
            return color;
        }
    `,
    
    // Cosine wave pattern
    cosineShader: `
        float pattern(vec2 pos) {
            float value = 0.0;
            // Use uDirection to control wave direction with more complexity
            value += uAmplitude * cos(dot(pos, uDirection) * uFrequency + uTime * 1.2);
            value += uAmplitude * cos(dot(pos, vec2(-uDirection.y, uDirection.x)) * uFrequency * 1.5 + uTime * 1.5);
            value += uAmplitude * 0.5 * cos(dot(pos, normalize(uDirection + vec2(-uDirection.y, uDirection.x))) * uFrequency * 0.8 - uTime * 0.8);
            
            // Add more variation with a cross-pattern
            value += uAmplitude * 0.3 * sin(dot(pos, normalize(vec2(uDirection.y, -uDirection.x))) * uFrequency * 2.0 + uTime);
            
            // Normalize to 0-1 range
            value = value * 0.25 + 0.5;
            return value;
        }
        
        void main() {
            vec2 pos = gl_FragCoord.xy / uResolution.xy;
            pos = pos * 2.0 - 1.0; // Center at origin and scale to -1 to 1
            pos.x *= uResolution.x / uResolution.y; // Correct for aspect ratio
            
            // Apply progress along the direction vector
            pos += uProgress * uDirection;
            
            float value = pattern(pos);
            vec3 color = tricolor_mix(value);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    
    // Perlin noise pattern
    perlinShader: `
        // Simple Perlin noise implementation
        float perlin2D(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            
            // Four corners in 2D of a tile
            float a = hash(i.x + i.y * 57.0);
            float b = hash(i.x + 1.0 + i.y * 57.0);
            float c = hash(i.x + i.y * 57.0 + 57.0);
            float d = hash(i.x + 1.0 + i.y * 57.0 + 57.0);
            
            // Smooth interpolation
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) + 
                (c - a) * u.y * (1.0 - u.x) + 
                (d - b) * u.x * u.y;
        }
        
        float pattern(vec2 pos) {
            float value = 0.0;
            
            // Basic Perlin noise layers (octaves)
            value += uAmplitude * perlin2D(pos * uFrequency + uTime * 0.1);
            value += uAmplitude * 0.5 * perlin2D(pos * uFrequency * 2.0 + uTime * 0.2);
            value += uAmplitude * 0.25 * perlin2D(pos * uFrequency * 4.0 + uTime * 0.3);
            
            return value;
        }
        
        void main() {
            vec2 pos = gl_FragCoord.xy / uResolution.xy;
            pos.x *= uResolution.x / uResolution.y; // Correct for aspect ratio
            
            // Apply progress
            pos += uProgress * vec2(2.0, 1.0);
            
            float value = pattern(pos);
            vec3 color = tricolor_mix(value);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    
    // Simplex noise pattern
    simplexShader: `
        // Simplex noise
        float simplex2D(vec2 p) {
            const float K1 = 0.366025404; // (sqrt(3)-1)/2
            const float K2 = 0.211324865; // (3-sqrt(3))/6
            
            vec2 i = floor(p + (p.x + p.y) * K1);
            vec2 a = p - i + (i.x + i.y) * K2;
            vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec2 b = a - o + K2;
            vec2 c = a - 1.0 + 2.0 * K2;
            
            vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
            vec3 n = h * h * h * h * vec3(
                dot(a, hash2(i) - 0.5),
                dot(b, hash2(i + o) - 0.5),
                dot(c, hash2(i + 1.0) - 0.5)
            );
            
            return 0.5 + 0.5 * (n.x + n.y + n.z) * 70.0;
        }
        
        float pattern(vec2 pos) {
            float value = 0.0;
            
            // Simplex noise layers
            value += uAmplitude * simplex2D(pos * uFrequency + uTime * 0.1);
            value += uAmplitude * 0.5 * simplex2D(pos * uFrequency * 2.0 + uTime * 0.15);
            value += uAmplitude * 0.25 * simplex2D(pos * uFrequency * 4.0 + uTime * 0.2);
            
            return value;
        }
        
        void main() {
            vec2 pos = gl_FragCoord.xy / uResolution.xy;
            pos.x *= uResolution.x / uResolution.y; // Correct for aspect ratio
            
            // Apply progress
            pos += uProgress * vec2(1.0, 0.5);
            
            float value = pattern(pos);
            vec3 color = tricolor_mix(value);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    
    // Voronoi pattern
    voronoiShader: `
        // Voronoi pattern
        float voronoi(vec2 p) {
            vec2 n = floor(p);
            vec2 f = fract(p);
            
            float md = 5.0;
            vec2 mr;
            
            for (int j = -1; j <= 1; j++) {
                for (int i = -1; i <= 1; i++) {
                    vec2 g = vec2(float(i), float(j));
                    vec2 o = hash2(n + g);
                    o = 0.5 + 0.5 * sin(uTime * 0.5 + 6.2831 * o);
                    
                    vec2 r = g + o - f;
                    float d = dot(r, r);
                    
                    if (d < md) {
                        md = d;
                        mr = r;
                    }
                }
            }
            
            return sqrt(md);
        }
        
        float pattern(vec2 pos) {
            return uAmplitude * voronoi(pos * uFrequency);
        }
        
        void main() {
            vec2 pos = gl_FragCoord.xy / uResolution.xy;
            pos.x *= uResolution.x / uResolution.y; // Correct for aspect ratio
            
            // Apply progress
            pos += uProgress * vec2(0.5, 0.3);
            
            float value = pattern(pos);
            vec3 color = tricolor_mix(value);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    
    // Fractal Brownian Motion (fBm)
    fractalShader: `
        // Simple Perlin noise implementation (same as in perlinShader)
        float perlin2D(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            
            float a = hash(i.x + i.y * 57.0);
            float b = hash(i.x + 1.0 + i.y * 57.0);
            float c = hash(i.x + i.y * 57.0 + 57.0);
            float d = hash(i.x + 1.0 + i.y * 57.0 + 57.0);
            
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) + 
                (c - a) * u.y * (1.0 - u.x) + 
                (d - b) * u.x * u.y;
        }
        
        // fBm using Perlin noise
        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = uAmplitude;
            float frequency = uFrequency;
            
            // Sum multiple octaves
            for (int i = 0; i < 6; i++) {
                value += amplitude * perlin2D(p * frequency + uTime * (0.05 * float(i + 1)));
                frequency *= 2.0;
                amplitude *= 0.5;
            }
            
            return value;
        }
        
        float pattern(vec2 pos) {
            return fbm(pos);
        }
        
        void main() {
            vec2 pos = gl_FragCoord.xy / uResolution.xy;
            pos.x *= uResolution.x / uResolution.y; // Correct for aspect ratio
            
            // Apply progress
            pos += uProgress * vec2(1.0, 0.7);
            
            float value = pattern(pos);
            vec3 color = tricolor_mix(value);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    
    // Plasma-like colormap functions
    colormap_red: `
        float colormap_red(float x) {
            if (x < 0.0) {
                return 54.0 / 255.0;
            } else if (x < 20049.0 / 82979.0) {
                return (829.79 * x + 54.51) / 255.0;
            } else {
                return 1.0;
            }
        }
    `,
    
    colormap_green: `
        float colormap_green(float x) {
            if (x < 20049.0 / 82979.0) {
                return 0.0;
            } else if (x < 327013.0 / 810990.0) {
                return (8546482679670.0 / 10875673217.0 * x - 2064961390770.0 / 10875673217.0) / 255.0;
            } else if (x <= 1.0) {
                return (103806720.0 / 483977.0 * x + 19607415.0 / 483977.0) / 255.0;
            } else {
                return 1.0;
            }
        }
    `,
    
    colormap_blue: `
        float colormap_blue(float x) {
            if (x < 0.0) {
                return 54.0 / 255.0;
            } else if (x < 7249.0 / 82979.0) {
                return (829.79 * x + 54.51) / 255.0;
            } else if (x < 20049.0 / 82979.0) {
                return 127.0 / 255.0;
            } else if (x < 327013.0 / 810990.0) {
                return (792.02249341361393720147485376583 * x - 64.364790735602331034989206222672) / 255.0;
            } else {
                return 1.0;
            }
        }
    `,
    
    plasma_colormap: `
        vec3 plasma_colormap(float x) {
            return vec3(colormap_red(x), colormap_green(x), colormap_blue(x));
        }
    `,
    
    // Improved noise function
    rand: `
        float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }
    `,
    
    noise: `
        float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u*u*(3.0-2.0*u);
        
            float res = mix(
                mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
                mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
            return res*res;
        }
    `,
    
    const_mtx: `
        const mat2 mtx = mat2(0.80, 0.60, -0.60, 0.80);
    `,
    
    fbm: `
        float fbm(vec2 p) {
            float f = 0.0;
            float amp = uAmplitude;
            float freq = uFrequency;
        
            f += 0.500000 * noise(p + uTime * 0.1 * freq); p = mtx*p*2.02;
            f += 0.031250 * noise(p * freq); p = mtx*p*2.01;
            f += 0.250000 * noise(p * freq); p = mtx*p*2.03;
            f += 0.125000 * noise(p * freq); p = mtx*p*2.01;
            f += 0.062500 * noise(p * freq); p = mtx*p*2.04;
            f += 0.015625 * noise(p * freq + sin(uTime * 0.1));
        
            return f / 0.96875 * amp;
        }
    `,
    
    pattern: `
        float pattern(vec2 p) {
            float warp = uProgress * 2.0; // Use progress as warp intensity
            return fbm(p + warp * fbm(p + warp * fbm(p)));
        }
    `,
    
    warpFbmShader: `
        // Plasma-like colormap functions
        float colormap_red(float x) {
            if (x < 0.0) {
                return 54.0 / 255.0;
            } else if (x < 20049.0 / 82979.0) {
                return (829.79 * x + 54.51) / 255.0;
            } else {
                return 1.0;
            }
        }
        
        float colormap_green(float x) {
            if (x < 20049.0 / 82979.0) {
                return 0.0;
            } else if (x < 327013.0 / 810990.0) {
                return (8546482679670.0 / 10875673217.0 * x - 2064961390770.0 / 10875673217.0) / 255.0;
            } else if (x <= 1.0) {
                return (103806720.0 / 483977.0 * x + 19607415.0 / 483977.0) / 255.0;
            } else {
                return 1.0;
            }
        }
        
        float colormap_blue(float x) {
            if (x < 0.0) {
                return 54.0 / 255.0;
            } else if (x < 7249.0 / 82979.0) {
                return (829.79 * x + 54.51) / 255.0;
            } else if (x < 20049.0 / 82979.0) {
                return 127.0 / 255.0;
            } else if (x < 327013.0 / 810990.0) {
                return (792.02249341361393720147485376583 * x - 64.364790735602331034989206222672) / 255.0;
            } else {
                return 1.0;
            }
        }
        
        vec3 plasma_colormap(float x) {
            return vec3(colormap_red(x), colormap_green(x), colormap_blue(x));
        }
        
        // Improved noise function
        float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }
        
        float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u*u*(3.0-2.0*u);
        
            float res = mix(
                mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
                mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
            return res*res;
        }
        
        const mat2 mtx = mat2(0.80, 0.60, -0.60, 0.80);
        
        float fbm(vec2 p) {
            float f = 0.0;
            float amp = uAmplitude;
            float freq = uFrequency;
        
            f += 0.500000 * noise(p + uTime * 0.1 * freq); p = mtx*p*2.02;
            f += 0.031250 * noise(p * freq); p = mtx*p*2.01;
            f += 0.250000 * noise(p * freq); p = mtx*p*2.03;
            f += 0.125000 * noise(p * freq); p = mtx*p*2.01;
            f += 0.062500 * noise(p * freq); p = mtx*p*2.04;
            f += 0.015625 * noise(p * freq + sin(uTime * 0.1));
        
            return f / 0.96875 * amp;
        }
        
        float pattern(vec2 p) {
            float warp = uProgress * 3.0; // Increased warp intensity
            float turbulence = sin(uTime * 0.2) * 0.5 + 0.5; // Add time-based variation
            return fbm(p + warp * fbm(p + turbulence * fbm(p)));
        }
        
        void main() {
            vec2 pos = gl_FragCoord.xy / uResolution.y;
            pos.x *= uResolution.x / uResolution.y; // Maintain aspect ratio
            
            float shade = pattern(pos * uFrequency);
            shade = clamp(shade, 0.0, 1.0);
            
            vec3 color;
            if (uUseColorMap) {
                // Use plasma colormap
                color = plasma_colormap(shade);
            } else {
                // Use the standard color mixing
                color = tricolor_mix(shade);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// Helper function to combine the base shader with a specific pattern shader
function createFragmentShader(patternCode) {
    return shaderLib.fragmentShaderBase + patternCode;
} 