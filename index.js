import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Text} from 'troika-three-text';

const BACKGROUND_COLOR = '#141414';
const CAMERA_FOV = 70;

class App {
    options;
    /**  @type {THREE.Scene} */
    #scene;
    /** @type {THREE.PerspectiveCamera} */
    #camera;
    /** @type {THREE.WebGLRenderer} */
    #renderer;
    /** @type {OrbitControls} */
    #controls;
    /** @type {THREE.Raycaster} */
    #raycaster
    /** @type {Map<string, THREE.Object3D>} */
    #textMeshCache = new Map();
    /** @type {THREE.Object3D | null} */
    #highlightedTextMesh;
    /**
     * Mouse position, normalize.
     * @type {THREE.Vector2}
     */
    #mouse;
    /**
     * Array of all the interactable meshes
     * @type {THREE.Object3D[]}
     */
    #interactableMeshes = [];

    /**
     * @param {Object} options - Configuration options for the app
     * @param {HTMLElement} options.container - The container DOM element
     * @param {number} options.gridSize - Number of planes along each axis
     * @param {number} options.gridOffset - Space between planes
     * @param {number} options.rectWidth - Width/height of each square plane
     * @param {string} options.rectBackgroundColor - Background color of the planes
     * @param {string} options.textColor - Default color of text
     * @param {string} options.highlightedTextColor - Color when text is hovered
     * @param {number} options.fontSize - Font size of the text
     * @param {number} options.lineHeight - Line height multiplier
     * @param {number} options.spaceWidth - Width between words
     * @param {string} options.fontUrl - URL to load font from
     * @param {string} options.text - Text content to display
     */
    constructor(options) {
        Object.defineProperty(this, 'options', {value: options, writable: false, configurable: false});
    }

    init = async () => {
        this.#setupScene();
        this.#setupCamera();
        this.#setupRenderer();
        this.#setupControls();
        this.#setupRaycaster();
        this.#setupMouse();

        this.options.container.appendChild(this.#renderer.domElement);
        window.addEventListener('resize', this.#handleContainerResize);
        window.addEventListener('pointermove', this.#handlePointerMove);

        return this.#createCubeOfPlanes();
    };

    update = () => {
        this.#processIntersections();
        this.#controls.update();
        this.#renderer.render(this.#scene, this.#camera);
    };

    #setupScene() {
        const sceneSize = this.#calculateSceneSize();
        this.#scene = new THREE.Scene();
        this.#scene.position.set(-sceneSize * 0.5, -sceneSize * 0.5, -sceneSize * 0.5);
        this.#scene.background = new THREE.Color(BACKGROUND_COLOR);
    }

    #setupCamera() {
        const sceneSize = this.#calculateSceneSize();
        const aspect = this.options.container.clientWidth / this.options.container.clientHeight;
        this.#camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, sceneSize * 10);
        this.#camera.position.set(sceneSize * 0.25, sceneSize * 0.25, sceneSize * 0.5);
    }

    #setupRenderer() {
        this.#renderer = new THREE.WebGLRenderer({antialias: true});
        this.#renderer.setSize(this.options.container.clientWidth, this.options.container.clientHeight);
    }

    #setupControls() {
        const sceneSize = this.#calculateSceneSize();
        this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
        this.#controls.enableDamping = true;
        this.#controls.minDistance = 1;
        this.#controls.maxDistance = sceneSize;
        this.#playIntroAnimation()
    }

    #setupRaycaster() {
        this.#raycaster = new THREE.Raycaster();
    }

    #setupMouse() {
        this.#mouse = new THREE.Vector2();
    }

    #calculateSceneSize() {
        const {rectWidth, gridOffset, gridSize} = this.options;
        return (rectWidth + gridOffset) * gridSize;
    }

    #playIntroAnimation() {
        this.#controls.autoRotate = true;

        setTimeout(() => {
            this.#controls.autoRotate = false;
        }, 2000)
    }

    #handleContainerResize = () => {
        this.#camera.aspect = this.options.container.clientWidth / this.options.container.clientHeight;
        this.#camera.updateProjectionMatrix();
        this.#renderer.setSize(this.options.container.clientWidth, this.options.container.clientHeight);
        this.update();
    };

    #handlePointerMove = (event) => {
        this.#mouse.x = (event.clientX / this.options.container.clientWidth) * 2 - 1;
        this.#mouse.y = -(event.clientY / this.options.container.clientHeight) * 2 + 1;
    };

    #processIntersections() {
        const {highlightedTextColor} = this.options;

        this.#raycaster.setFromCamera(this.#mouse, this.#camera);
        const intersects = this.#raycaster.intersectObjects(this.#interactableMeshes, false);
        const hovered = intersects[0]?.object || null;

        // Skip the update if we're hovering the same object
        if (this.#highlightedTextMesh === hovered) return;

        this.#resetHighlight();
        this.#applyHighlight(hovered, highlightedTextColor);

        this.#highlightedTextMesh = hovered;
    }

    #resetHighlight() {
        if (this.#highlightedTextMesh?.text) {
            this.#highlightedTextMesh.color = this.options.textColor;
            this.#highlightedTextMesh.sync();
        }
        this.#renderer.domElement.style.cursor = 'auto';
    }

    #applyHighlight(textMesh, color) {
        if (textMesh?.text) {
            textMesh.color = color;
            textMesh.sync();
            this.#renderer.domElement.style.cursor = 'pointer';
        }
    }

    #createCubeOfPlanes = async () => {
        const {rectWidth, rectBackgroundColor, gridOffset, gridSize} = this.options;
        const cellSize = rectWidth + gridOffset;
        const planeGeometry = new THREE.PlaneGeometry(rectWidth, rectWidth);
        const planeMaterial = new THREE.MeshBasicMaterial({color: rectBackgroundColor, side: THREE.DoubleSide});
        const planeMesh = new THREE.InstancedMesh(planeGeometry, planeMaterial, Math.pow(gridSize, 3));
        const textGroup = new THREE.Group();
        let instanceIndex = 0;
        const syncPromises = [];

        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    const positionOffset = Math.random() * cellSize * 0.5;
                    const rotationAngle = Math.random() * Math.PI * 2;
                    const position = new THREE.Vector3(x * cellSize + positionOffset, y * cellSize + positionOffset, z * cellSize + positionOffset);
                    const rotation = new THREE.Euler(rotationAngle, rotationAngle, rotationAngle);
                    const matrix = new THREE.Matrix4().makeRotationFromEuler(rotation).setPosition(position);

                    planeMesh.setMatrixAt(instanceIndex++, matrix);

                    const textMeshPromise = this.#createTextMeshes(position, rotation).then(group => {
                        textGroup.add(group);
                        return group;
                    });

                    syncPromises.push(textMeshPromise);
                }
            }
        }

        this.#interactableMeshes.push(planeMesh);
        this.#scene.add(planeMesh, textGroup);

        return Promise.all(syncPromises);
    };

    #createTextMeshes = async (position, rotation) => {
        const group = new THREE.Group();
        const frontGroup = new THREE.Group();
        const backGroup = new THREE.Group();

        group.position.copy(position);
        group.rotation.copy(rotation);

        frontGroup.position.set(-this.options.rectWidth * 0.5, this.options.rectWidth * 0.5, 0.001);
        backGroup.position.set(this.options.rectWidth * 0.5, this.options.rectWidth * 0.5, -0.001);
        backGroup.rotateY(Math.PI);

        const textMeshes = await this.#generateTextMeshes();
        this.#layoutTextMeshes(textMeshes, frontGroup, backGroup);

        group.add(frontGroup, backGroup);
        return group;
    };

    #generateTextMeshes() {
        const {fontSize, rectWidth, fontUrl, textColor, text} = this.options;
        const words = text.split(' ');

        const meshes = words.map(word => {
            if (this.#textMeshCache.has(word)) {
                return this.#textMeshCache.get(word).clone();
            }

            // TODO Replace it with BatchedText after upgrading to troika-three-text@0.50.0
            const mesh = new Text();
            mesh.text = word;
            mesh.fontSize = fontSize;
            mesh.font = fontUrl;
            mesh.maxWidth = rectWidth;
            mesh.color = textColor;

            this.#textMeshCache.set(word, mesh);

            return mesh;
        });

        return Promise.all(meshes.map(mesh => new Promise(res => mesh.sync(() => res(mesh)))));
    }

    #layoutTextMeshes(meshes, frontGroup, backGroup) {
        const {fontSize, spaceWidth, rectWidth} = this.options;
        const lineHeight = fontSize * this.options.lineHeight;
        let x = 0, y = 0;

        for (const mesh of meshes) {
            const width = mesh.textRenderInfo?.blockBounds?.[2] || 0;

            // Move to new line if width exceeds rect width
            if (x + width > rectWidth) {
                x = 0;
                y -= lineHeight;
            }

            // Stop rendering if text exceeds box height
            if (y - lineHeight < -rectWidth) break;

            mesh.position.set(x, y, 0);
            const backMesh = mesh.clone();
            backMesh.position.set(x, y, 0);

            frontGroup.add(mesh);
            backGroup.add(backMesh);

            this.#interactableMeshes.push(mesh, backMesh);

            x += width + spaceWidth;
        }
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const options = {
        container: document.getElementById('app'),
        gridSize: 5,
        gridOffset: 5,
        rectWidth: 1,
        rectBackgroundColor: '#ffffff',
        textColor: '#121212',
        highlightedTextColor: '#ff0000',
        fontSize: 0.13,
        lineHeight: 1.2,
        spaceWidth: 0.05,
        fontUrl: 'https://fonts.cdnfonts.com/s/12165/Roboto-Regular.woff',
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    };

    const app = new App(options);
    await app.init();

    const animate = () => {
        app.update();
        requestAnimationFrame(animate);
    };

    animate();
});
