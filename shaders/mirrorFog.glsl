// Vertex Shader
attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    
    vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * worldPosition;
}

// Fragment Shader
precision mediump float;

uniform sampler2D tDiffuse;
uniform float fogAmount;
uniform float time;
uniform float temperature;
uniform float humidity;
uniform vec2 resolution;

varying vec2 vUv;
varying vec3 vWorldPosition;

// Noise function for fog pattern
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return value;
}

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);

    // Create fog pattern
    vec2 fogCoord = vUv * 10.0 + time * 0.1;
    float fogPattern = fbm(fogCoord);

    // Add condensation droplets
    vec2 dropCoord = vUv * 50.0;
    float dropPattern = 0.0;

    for (int i = 0; i < 8; i++) {
        vec2 dropPos = vec2(
        float(i) * 6.789 + time * 0.2,
        float(i) * 3.456 + time * 0.15
    );
        
        vec2 dropUV = mod(dropCoord + dropPos, 1.0);
        float dropDist = length(dropUV - 0.5);

        if (dropDist < 0.1) {
            float dropIntensity = 1.0 - smoothstep(0.05, 0.1, dropDist);
            dropPattern += dropIntensity * 0.3;
        }
    }

    // Combine fog effects
    float totalFog = fogAmount * (0.7 * fogPattern + 0.3 * dropPattern);
    totalFog *= (0.8 + 0.2 * sin(time * 2.0)); // Slight breathing effect

    // Temperature-based fogging
    float tempFactor = clamp((temperature - 15.0) / 10.0, 0.0, 1.0);
    totalFog *= (1.0 - tempFactor);

    // Humidity effect
    float humidityFactor = clamp(humidity / 100.0, 0.0, 1.0);
    totalFog *= humidityFactor;

    // Edge fogging (more fog at edges)
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edgeFog = 1.0 - smoothstep(0.0, 0.2, edgeDistance);
    totalFog += edgeFog * 0.3 * fogAmount;

    // Apply fog color
    vec3 fogColor = vec3(0.9, 0.95, 1.0); // Slight blue tint
    vec3 finalColor = mix(texColor.rgb, fogColor, clamp(totalFog, 0.0, 0.8));

    gl_FragColor = vec4(finalColor, texColor.a);
}
