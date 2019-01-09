var modelInfo = ModelIndex.getCurrentModel();
if (!modelInfo) {
    modelInfo = TutorialModelIndex.getCurrentModel();
}
if (!modelInfo) {
    modelInfo = TutorialPbrModelIndex.getCurrentModel();
}
if (!modelInfo) {
    modelInfo = TutorialFurtherPbrModelIndex.getCurrentModel();
}
if (!modelInfo) {
    modelInfo = TutorialFeatureTestModelIndex.getCurrentModel();
}
if (!modelInfo) {
    modelInfo = TutorialExtensionTestModelIndex.getCurrentModel();
}
if (!modelInfo) {
    document.getElementById('container').innerHTML = 'Please specify a model to load';
    throw new Error('Model not specified or not found in list.');
}

var gltf = null;
var mixer = null;
var clock = new THREE.Clock();
var axis;
var gui;
var ROTATE = true;
var AXIS = true;
var scene;
var camera;
var renderer;
var controls;

init();
animate();

function resize() {
    var container = document.getElementById('container');
    var width = container.offsetWidth;
    var height = container.offsetHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );
}

function init() {
    scene = new THREE.Scene();

    var hemispheric = new THREE.HemisphereLight( 0xffffff, 0x222222, 1.2 );
    scene.add(hemispheric);
/*
    var ambient = new THREE.AmbientLight( 0xffffff, 0.3 );
    scene.add( ambient );

    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
    directionalLight.position.set( 0.5, 0, 0.866 );
    scene.add( directionalLight );
*/

    camera = new THREE.PerspectiveCamera( 75, 1, 1, 10000 );
    camera.position.set(0, 2, 3);
    scene.add( camera );

    var manager = new THREE.LoadingManager();
    manager.onProgress = function ( item, loaded, total ) {
        console.log( item, loaded, total );
    };

    // monkeypatch
    // https://github.com/mrdoob/three.js/pull/11498#issuecomment-308136310
    THREE.PropertyBinding.sanitizeNodeName = (n) => n;

    var loader = new THREE.GLTFLoader();
    loader.setCrossOrigin( 'anonymous' );

    THREE.DRACOLoader.setDecoderPath( '../../libs/three.js/r100dev/draco/gltf/' );
    loader.setDRACOLoader( new THREE.DRACOLoader() );

    var scale = modelInfo.scale;
    var url = "../../" + modelInfo.category + "/" + modelInfo.path;
    if(modelInfo.url) {
        url = modelInfo.url;
    }
    loader.load(url, function (data) {
        gltf = data;
        var object;
        if ( gltf.scene !== undefined ) {
            object = gltf.scene; // default scene
        } else if ( gltf.scenes.length > 0 ) {
            object = gltf.scenes[0]; // other scene
        }
        object.scale.set(scale, scale, scale);
        if (modelInfo.name == "GearboxAssy" ) {
            object.position.set(-159.20*scale, -17.02*scale, -3.21*scale);
        }
        var animations = gltf.animations;
        if ( animations && animations.length ) {
            mixer = new THREE.AnimationMixer( object );
            for ( var i = 0; i < animations.length; i ++ ) {
                var animation = animations[ i ];
                mixer.clipAction( animation ).play();
            }
        }

        var envMap = getEnvMap();
        object.traverse( function( node ) {
            if ( node.isMesh ) {
                var materials = Array.isArray( node.material ) ? node.material : [ node.material ];
                materials.forEach( function( material ) {
                    // MeshBasicMaterial means that KHR_materials_unlit is set, so reflections are not needed.
                    if ( 'envMap' in material && !material.isMeshBasicMaterial ) {
                        material.envMap = envMap;
                        material.needsUpdate = true;
                    }
                } );
            }
        } );
        scene.background = envMap;

        scene.add(object);
    });

    axis = new THREE.AxesHelper(1000);
    scene.add(axis);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.gammaOutput = true; // if >r88, models are dark unless you activate gammaOutput
    renderer.gammaFactor = 2.2;
    renderer.setClearColor( 0xaaaaaa );
    renderer.setPixelRatio( window.devicePixelRatio );

    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.userPan = false;
    controls.userPanSpeed = 0.0;
    controls.maxDistance = 5000.0;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.autoRotate = true;
    controls.autoRotateSpeed = -3.0;

    // GUI
    gui = new dat.GUI();
    var guiRotate = gui.add(window, 'ROTATE').name('Rotate');
    var guiAxis = gui.add(window, 'AXIS').name('Axis');

    guiRotate.onChange(function (value) {
        controls.autoRotate = value;
    });
    guiAxis.onChange(function (value) {
        axis.visible = value;
    });

    document.body.appendChild( renderer.domElement );

    resize();
    window.addEventListener( 'resize', resize, false );
}

// https://github.com/mrdoob/three.js/tree/dev/examples/textures/cube/skybox
function getEnvMap() {
    var path = '../../textures/cube/skybox/';
    var format = '.jpg';
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];
    var loader = new THREE.CubeTextureLoader();
    loader.setCrossOrigin( 'anonymous' );
    var envMap = loader.load( urls );
    envMap.format = THREE.RGBFormat;
    // The color of the environment map is displayed brighter than r98
    // https://github.com/mrdoob/three.js/issues/15285
    envMap.encoding = THREE.sRGBEncoding;
    return envMap;
}

function animate() {
    requestAnimationFrame( animate );
    if ( mixer ) mixer.update( clock.getDelta() );
    controls.update();
    render();
}

function render() {
    renderer.render( scene, camera );
}
