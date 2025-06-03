// Se asegura de que el DOM esté cargado antes de ejecutar el script
document.addEventListener("DOMContentLoaded", function() {
    const tunnelMessage = document.getElementById("tunnelMessage");
    if (tunnelMessage) { // Check if element exists
        setInterval(() => {
            if (tunnelMessage.style.opacity === "0" || tunnelMessage.style.opacity === "") {
                tunnelMessage.style.opacity = "1";
            } else {
                tunnelMessage.style.opacity = "0";
            }
        }, 4000);
    } else {
        console.error("Elemento con ID 'tunnelMessage' no encontrado.");
    }

    // Card background particle effect
    (function() {
        const canvas = document.getElementById("cardBgEffect");
        if (!canvas) {
            console.error("Elemento con ID 'cardBgEffect' no encontrado.");
            return; // Exit if canvas not found
        }
        if (!canvas.parentElement) {
            console.error("Elemento 'cardBgEffect' no tiene un elemento padre.");
            return;
        }
        const ctx = canvas.getContext("2d");

        function resize() {
            // Asegurarse de que parentElement exista antes de acceder a offsetWidth/Height
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.offsetWidth;
                canvas.height = canvas.parentElement.offsetHeight;
            }
        }
        resize();
        window.addEventListener("resize", resize);

        const particles = [];
        const particleCount = 25;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.5 + 0.5,
                vx: Math.random() * 1 - 0.5,
                vy: Math.random() * 1 - 0.5,
                color: `rgba(200, 220, 255, ${Math.random() * 0.3 + 0.3})`
            });
        }

        function animate() {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particleCount; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();

                for (let j = i + 1; j < particleCount; j++) {
                    const p2 = particles[j];
                    const distance = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));
                    if (distance < 60) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(200, 220, 255, ${0.03 * (1 - distance / 60)})`;
                        ctx.lineWidth = 0.3;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
        }
        animate();
    })();

    // Portal and Tunnel Logic
    const card = document.getElementById("portalCard");
    const button = document.getElementById("portalButton");
    const canvasTunnel = document.getElementById("tunnelCanvas"); // Asegúrate que el ID en HTML sea "tunnelCanvas"
    const tunnelContainer = document.getElementById("tunnelContainer");

    if (!card || !button || !canvasTunnel || !tunnelContainer) {
        console.error("Faltan uno o más elementos del DOM para el portal/túnel.");
        return;
    }

    if (card) card.addEventListener("click", startPortal);
    if (button) button.addEventListener("click", (e) => {
        e.stopPropagation();
        startPortal();
    });

    var renderer, scene, camera, tube;
    var lights = [], path, organicPoints, pct = 0, pct2 = 0;
    var renderFrameId;
    let isAnimating = false;

    let tunnelEndPoint; // No es necesario inicializar aquí si se asigna en initTunnel
    let hoverTime = 0;
    var w = window.innerWidth;
    var h = window.innerHeight;

    var cameraSpeed = 0.00018;
    var lightSpeed = 0.0012;
    var tubularSegments = 600;
    var radialSegments = 8;
    var tubeRadius = 3;

    function startPortal() {
        if (isAnimating) return;
        isAnimating = true; // Establecer al inicio para evitar múltiples llamadas rápidas

        document.body.style.backgroundImage = "none";
        document.body.style.backgroundColor = "#000000";

        if (canvasTunnel) canvasTunnel.style.display = "block";
        if (tunnelContainer) {
            tunnelContainer.style.display = "flex";
            tunnelContainer.classList.add("active");
        }

        if (!scene) { // Initialize Three.js scene only once
            if (typeof THREE === 'undefined') {
                console.error("Three.js no está cargado. Asegúrate de que el script de Three.js esté incluido y se cargue antes que este script.");
                isAnimating = false; // Restablecer si no se puede inicializar
                return;
            }
            initTunnel();
        }
        render(); // Iniciar el bucle de renderizado

        setTimeout(() => {
            if (canvasTunnel) canvasTunnel.classList.add("active");
            if (card) card.classList.add("zoomIn");
            setTimeout(() => {
                if (card) card.style.display = "none";
            }, 2000);
        }, 100);
    }

    function createCircularPath() {
        const points = [];
        const totalPoints = 200;
        const controlPoints = [
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(20, 10, -50),
            new THREE.Vector3(40, -10, -100), new THREE.Vector3(60, 15, -150),
            new THREE.Vector3(50, -5, -200), new THREE.Vector3(0, 0, -250),
            new THREE.Vector3(-100, 0, -200), new THREE.Vector3(-150, 0, -100),
            new THREE.Vector3(-100, 0, 0), new THREE.Vector3(-50, 10, 100),
            new THREE.Vector3(-20, -10, 150), new THREE.Vector3(0, 0, 200)
        ];
        const curve = new THREE.CatmullRomCurve3(controlPoints);
        curve.tension = 0.1;
        for (let i = 0; i < totalPoints; i++) {
            const t = i / (totalPoints - 1);
            points.push(curve.getPoint(t));
        }
        return points;
    }

    function createBackOfPortalCard() {
        const geometry = new THREE.PlaneGeometry(20, 28);
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 910;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgba(10, 12, 18, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const gradient = ctx.createLinearGradient(canvas.width, canvas.height, 0, 0);
        gradient.addColorStop(0, "#FFD700"); // Gold
        gradient.addColorStop(1, "#DAA520"); // Darker Gold
        ctx.fillStyle = gradient;
        ctx.fillRect(5, 5, canvas.width - 10, canvas.height - 10); // fillRect with small padding

        ctx.filter = "blur(8px)";
        function drawBlob(x, y, wid, hei, color) {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, wid / 2);
            grad.addColorStop(0, color);
            grad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(x, y, wid / 2, hei / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        drawBlob(canvas.width * 0.3, canvas.height * 0.3, 150, 150, "rgba(255, 215, 0, 0.5)");
        drawBlob(canvas.width * 0.7, canvas.height * 0.6, 120, 120, "rgba(218, 165, 32, 0.5)");
        ctx.filter = "none";

        ctx.font = "bold 30px Unica One";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 10;
        ctx.fillText("EYBAGIT", canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = "24px Unica One";
        ctx.fillText("¡PROXIMAMENTE!", canvas.width / 2, canvas.height / 2 + 20);
        ctx.shadowBlur = 0;
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
        return new THREE.Mesh(geometry, material);
    }

    function createCodeSnippetSprite(text) {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(40, 40, 40, 0.6)"; // Semi-transparent dark background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = "15px 'Consolas', monospace";
        ctx.fillStyle = "#A9DC76"; // A greenish color for code text
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const lines = text.split("\n");
        const lineHeight = 18;

        for (let i = 0; i < lines.length; i++) {
            if (10 + i * lineHeight > canvas.height - 10) break; // Prevent overflow
            ctx.fillText(lines[i], 10, 10 + i * lineHeight);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const sprite = new THREE.Sprite(material);
        let scaleFactor = 7 + Math.random() * 9;
        sprite.scale.set(scaleFactor, scaleFactor * (canvas.height / canvas.width), 1);
        return sprite;
    }

    function createCircleTexture(colorStr = "rgba(255,255,255,1)") {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d");
        context.beginPath();
        context.arc(16, 16, 16, 0, 2 * Math.PI, false);
        context.fillStyle = colorStr;
        context.fill(); // Primera pasada de color sólido

        // Gradiente para efecto de brillo suave
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, "rgba(255,255,255,1)"); // Centro brillante
        gradient.addColorStop(0.4, colorStr); // Color principal
        gradient.addColorStop(1, "rgba(0,0,0,0)"); // Transparente en los bordes

        context.globalCompositeOperation = "source-over"; // Asegurar que se dibuje encima
        context.fillStyle = gradient;
        context.beginPath(); // Necesario reiniciar el path para el nuevo fill
        context.arc(16, 16, 16, 0, 2 * Math.PI, false);
        context.fill(); // Aplicar el gradiente
        return canvas;
    }


    function initTunnel() {
        renderer = new THREE.WebGLRenderer({
            canvas: canvasTunnel, // Asegúrate que este ID exista en el HTML
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(w, h);

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x281800, 0.0060); // Darker warm fog

        camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        if (canvasTunnel) { // Event listener solo si el canvas existe
            canvasTunnel.addEventListener("click", function(event) {
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(scene.children, true);
                for (let i = 0; i < intersects.length; i++) {
                    if (intersects[i].object.userData && intersects[i].object.userData.isBackCard) {
                        completePortalLoop();
                        break;
                    }
                }
            });
        }


        const starsCount = 1000;
        const starsPositions = new Float32Array(starsCount * 3);
        const starSpread = 1500;
        for (let i = 0; i < starsCount; i++) {
            starsPositions[i * 3] = THREE.MathUtils.randFloatSpread(starSpread);
            starsPositions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(starSpread);
            starsPositions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(starSpread * 1.2);
        }
        const starsGeometry = new THREE.BufferGeometry();
        starsGeometry.setAttribute("position", new THREE.BufferAttribute(starsPositions, 3));

        const starsTexture = new THREE.CanvasTexture(createCircleTexture("rgba(255, 230, 180, 0.9)"));
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFE08D,
            size: 1.4,
            map: starsTexture,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(starField);

        organicPoints = createCircularPath();
        if (!organicPoints || organicPoints.length === 0) {
            console.error("createCircularPath no devolvió puntos válidos.");
            return; // No continuar si la ruta no es válida
        }
        path = new THREE.CatmullRomCurve3(organicPoints);
        const tubeGeometry = new THREE.TubeBufferGeometry(path, tubularSegments, tubeRadius, radialSegments, false);

        const tubeColors = [];
        const goldColor1 = new THREE.Color(0xFFD700);
        const goldColor2 = new THREE.Color(0xDAA520);
        const accentColor = new THREE.Color(0xFF8C00);

        for (let i = 0; i < tubeGeometry.attributes.position.count; i++) {
            let color;
            const phase = (i / (radialSegments * 2)) * Math.PI;
            if (i % 3 === 0) color = goldColor1.clone().lerp(accentColor, (Math.sin(phase) + 1) / 2);
            else if (i % 3 === 1) color = goldColor2.clone().lerp(goldColor1, (Math.cos(phase + Math.PI / 2) + 1) / 2);
            else color = accentColor.clone().lerp(goldColor2, (Math.sin(phase + Math.PI) + 1) / 2);
            tubeColors.push(color.r, color.g, color.b);
        }
        tubeGeometry.setAttribute("color", new THREE.Float32BufferAttribute(tubeColors, 3));

        const tubeMaterial = new THREE.MeshLambertMaterial({
            side: THREE.BackSide,
            vertexColors: true,
            wireframe: true,
            emissive: 0x402800,
            emissiveIntensity: 0.7
        });
        tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        scene.add(tube);

        const backOfCard = createBackOfPortalCard();
        // Asegurarse de que organicPoints y sus índices sean válidos
        if (organicPoints.length > 0) {
            const endPointIndex = organicPoints.length - 1;
            const cardPos = organicPoints[endPointIndex];
            if (cardPos) {
                backOfCard.position.set(cardPos.x, cardPos.y, cardPos.z);
                tunnelEndPoint = cardPos; // Asignar aquí
            }
            // Solo hacer lookAt si el índice es válido
            if (endPointIndex - 5 >= 0 && organicPoints[endPointIndex - 5]) {
                 const lookAtPoint = organicPoints[endPointIndex - 5];
                 if (!cardPos.equals(lookAtPoint)) { // Evitar lookAt en la misma posición
                    backOfCard.lookAt(lookAtPoint);
                 }
            }
            backOfCard.userData = { isBackCard: true };
            scene.add(backOfCard);
        }


        scene.add(new THREE.AmbientLight(0x503010));
        lights = [];
        const lightColors = [0xFFE799, 0xFFC75C, 0xFAA43A];
        for (let i = 0; i < 3; i++) {
            let l = new THREE.PointLight(lightColors[i], 1.0, 40, 1.8);
            lights.push(l);
            scene.add(l);
        }

        const snippetVarieties = [
            '<div class="portal-fx">\n <h1 class="glow-title">EYBAGIT</h1>\n <p>Loading multiverse...</p>\n</div>',
            'const scene = new THREE.Scene();\nconst camera = new THREE.PerspectiveCamera();\nrenderer.render(scene, camera);',
            '@keyframes pulse-gold {\n 0% { box-shadow: 0 0 10px #FFD700; }\n 50% { box-shadow: 0 0 30px #FF8C00; }\n 100% { box-shadow: 0 0 10px #DAA520; }\n}',
            'body {\n background: #000;\n color: #FFD700;\n font-family: "Unica One";\n}'
        ];
        const numSnippets = 45;
        // Verificar que organicPoints tenga al menos un punto
        if (organicPoints && organicPoints.length > 0) {
            const pathStartZ = organicPoints[0].z;
            const pathEndZ = organicPoints[organicPoints.length-1].z;
            const depthFactor = pathEndZ - pathStartZ;

            for (let i = 0; i < numSnippets; i++) {
                let snippet = snippetVarieties[Math.floor(Math.random() * snippetVarieties.length)];
                let sprite = createCodeSnippetSprite(snippet);
                const r = tubeRadius * 2 + Math.random() * tubeRadius * 5;
                const angle = Math.random() * Math.PI * 2;
                const depth = pathStartZ + Math.random() * depthFactor;

                sprite.position.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.7, depth);
                sprite.material.rotation = (Math.random() - 0.5) * Math.PI * 0.5;
                scene.add(sprite);
            }
        }


        const additionalStarsCount = 2000;
        const additionalStarSpread = 2000;
        const additionalStarsPositions = new Float32Array(additionalStarsCount * 3);
        for (let i = 0; i < additionalStarsCount; i++) {
            additionalStarsPositions[i * 3] = THREE.MathUtils.randFloatSpread(additionalStarSpread);
            additionalStarsPositions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(additionalStarSpread);
            additionalStarsPositions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(additionalStarSpread * 1.2);
        }
        const additionalStarsGeometry = new THREE.BufferGeometry();
        additionalStarsGeometry.setAttribute("position", new THREE.BufferAttribute(additionalStarsPositions, 3));
        const additionalStarsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFE0,
            size: 2.3,
            opacity: 0.8,
            transparent: true,
            map: starsTexture, // Reutilizar la textura de estrella
            blending: THREE.AdditiveBlending
        });
        const additionalStarField = new THREE.Points(additionalStarsGeometry, additionalStarsMaterial);
        scene.add(additionalStarField);

        window.onresize = function() {
            w = window.innerWidth;
            h = window.innerHeight;
            if (camera) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            }
            if (renderer) {
                renderer.setSize(w, h);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            }
        };
    }


    function render() {
        if (!isAnimating || !scene || !camera || !path || !path.getPointAt) {
            if (renderFrameId) cancelAnimationFrame(renderFrameId);
            renderFrameId = null; // Limpiar ID
            isAnimating = false;
            return;
        }
        renderFrameId = requestAnimationFrame(render);

        pct += cameraSpeed;
        let arrivedAtEnd = false;
        if (pct >= 0.985) { // Detenerse justo antes del final para evitar problemas con getPointAt(1)
            pct = 0.9849; // Clavarlo en un valor seguro
            arrivedAtEnd = true;
        }

        pct2 += lightSpeed;
        if (pct2 >= 0.995) pct2 = 0; // Reiniciar para el movimiento de luces

        if (arrivedAtEnd) {
            hoverTime += 0.015;
            const hoverOffset = Math.sin(hoverTime) * 0.4;
            const base = path.getPointAt(0.985); // Usar valores seguros
            const target = path.getPointAt(0.99); // Usar valores seguros
            if (base && target) {
                camera.position.set(base.x, base.y + hoverOffset, base.z);
                camera.lookAt(target);
            }
        } else {
            const pt1 = path.getPointAt(pct);
            const lookAheadPct = Math.min(pct + 0.01, 0.995); // Asegurar que no exceda 0.995
            const pt2 = path.getPointAt(lookAheadPct);
            if (pt1 && pt2) {
                camera.position.set(pt1.x, pt1.y, pt1.z);
                camera.lookAt(pt2);
            }
        }

        for (let i = 0; i < lights.length; i++) {
            const offset = ((i * 13) % 17) / 20 + (i * 0.03);
            const lightPct = (pct2 + offset) % 0.995; // Asegurar que no exceda 0.995
            const pos = path.getPointAt(lightPct);
            if (pos) lights[i].position.set(pos.x, pos.y, pos.z);
        }
        if (renderer) renderer.render(scene, camera);
    }

    function completePortalLoop() {
        if (renderFrameId) {
            cancelAnimationFrame(renderFrameId);
            renderFrameId = null; // Importante limpiar el ID
        }
        isAnimating = false;
        pct = 0; // Reset progress
        pct2 = 0; // Reset light progress

        if (canvasTunnel) {
            canvasTunnel.style.transition = "opacity 0.7s ease-out";
            canvasTunnel.style.opacity = "0";
        }
        if (card) card.classList.remove("zoomIn");
        if (tunnelContainer) tunnelContainer.classList.remove("active");

        setTimeout(() => {
            if (canvasTunnel) canvasTunnel.style.display = "none"; // Ocultar después de la transición
            if (card) {
                card.style.display = "flex";
                card.style.opacity = "0"; // Empezar invisible para fade in
                card.style.transform = "scale(0.8)"; // Empezar pequeño para scale up
                card.style.transition = "all 1s ease-out"; // Transición para la reaparición
                setTimeout(() => { // Pequeño delay para que las propiedades de transición se apliquen
                    card.style.opacity = "1";
                    card.style.transform = "scale(1)";
                    const portalContent = document.getElementById("portalContent");
                    if (portalContent) {
                        portalContent.style.opacity = "1";
                        portalContent.style.transform = "scale(1)";
                    }
                    document.body.style.backgroundImage = `url("http://mattcannon.games/codepen/glow/background.png")`;
                    document.body.style.backgroundColor = "#0a0a0a";
                }, 50);
            }
        }, 700); // Esperar que la opacidad del túnel llegue a 0
    }
});