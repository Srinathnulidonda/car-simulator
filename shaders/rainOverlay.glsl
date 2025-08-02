// Vertex Shader
attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment Shader
precision mediump float;

uniform sampler2D tDiffuse;
uniform float time;
uniform float rainIntensity;
uniform float windStrength;
uniform vec2 windDirection;
uniform float speed;

varying vec2 vUv;

// Rain drop function
float rainDrop(vec2 uv, vec2 center, float radius, float intensity) {
    float dist = length(uv - center);
    float drop = 1.0 - smoothstep(radius * 0.5, radius, dist);

    // Add ripple effect
    float ripple = sin(dist * 20.0 - time * 5.0) * 0.1;
    drop += ripple * intensity;

    return clamp(drop * intensity, 0.0, 1.0);
}

// Water streak function
float waterStreak(vec2 uv, vec2 start, vec2 end, float width, float intensity) {
    vec2 dir = normalize(end - start);
    vec2 perpDir = vec2(-dir.y, dir.x);
    
    vec2 toPixel = uv - start;
    float alongStreak = dot(toPixel, dir);
    float acrossStreak = abs(dot(toPixel, perpDir));
    
    float lengthFactor = smoothstep(0.0, length(end - start), alongStreak) *
        smoothstep(length(end - start), 0.0, alongStreak);
    float widthFactor = 1.0 - smoothstep(0.0, width, acrossStreak);

    return lengthFactor * widthFactor * intensity;
}

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    
    float totalRain = 0.0;

    if (rainIntensity > 0.0) {
        // Animated rain drops
        for (int i = 0; i < 12; i++) {
            float fi = float(i);

            // Rain drop positions
            vec2 dropPos = vec2(
            mod(fi * 0.618 + time * 0.3, 1.0),
            mod(fi * 0.314 + time * 0.8, 1.0)
        );

            // Add wind effect
            dropPos.x += windDirection.x * windStrength * 0.1;
            dropPos.y += windDirection.y * windStrength * 0.1;
            
            float dropSize = 0.01 + fract(fi * 0.123) * 0.02;
            float dropIntensity = 0.3 + fract(fi * 0.456) * 0.4;

            totalRain += rainDrop(vUv, dropPos, dropSize, dropIntensity);
        }

        // Water streaks from speed
        if (speed > 10.0) {
            float streakCount = min(speed / 20.0, 8.0);

            for (int j = 0; j < 8; j++) {
                if (float(j) >= streakCount) break;
                
                float fj = float(j);
                
                vec2 streakStart = vec2(
                    mod(fj * 0.789 + time * 0.5, 1.0),
                    mod(fj * 0.234 + time * 0.3, 1.0)
                );
                
                vec2 streakEnd = streakStart + normalize(windDirection) * 0.1 * (speed / 100.0);
                
                float streakWidth = 0.002 + fract(fj * 0.567) * 0.003;
                float streakIntensity = 0.2 + fract(fj * 0.891) * 0.3;

                totalRain += waterStreak(vUv, streakStart, streakEnd, streakWidth, streakIntensity);
            }
        }

        // Heavy rain effect
        if (rainIntensity > 0.7) {
            vec2 heavyRainCoord = vUv * 20.0 + time * 2.0;
            float heavyRainNoise = fract(sin(dot(heavyRainCoord, vec2(12.9898, 78.233))) * 43758.5453);

            if (heavyRainNoise > 0.95) {
                totalRain += 0.5 * rainIntensity;
            }
        }

        totalRain *= rainIntensity;
    }

    // Apply rain effect
    vec3 rainColor = vec3(0.7, 0.8, 1.0); // Slight blue tint
    vec3 finalColor = mix(texColor.rgb, rainColor, clamp(totalRain, 0.0, 0.5));

    // Add distortion effect for heavy rain
    if (rainIntensity > 0.5 && totalRain > 0.1) {
        vec2 distortion = vec2(
        sin(vUv.y * 10.0 + time * 3.0) * 0.01,
        cos(vUv.x * 15.0 + time * 4.0) * 0.01
    ) * rainIntensity * totalRain;
        
        vec4 distortedColor = texture2D(tDiffuse, vUv + distortion);
        finalColor = mix(finalColor, distortedColor.rgb, 0.3);
    }

    gl_FragColor = vec4(finalColor, texColor.a);
}