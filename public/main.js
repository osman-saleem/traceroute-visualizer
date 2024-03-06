import * as THREE from '/build/three.module.js';
import {OrbitControls} from '/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
const canvas = document.querySelector('#bg');
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(innerWidth,innerHeight);
camera.position.set(0,0,2.5);
const controls = new OrbitControls(camera,renderer.domElement);

// earth
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1,100,1000),
  new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load("earth.jpg")
  })
)
scene.add(sphere);

// pin
function addPin(lat, lng){
  let pin = new THREE.Mesh(
    new THREE.SphereGeometry(0.01,4,4),
    new THREE.MeshBasicMaterial({color: 0xFF0000})
  )
  let coords = LLtoC(lat,lng);
  pin.position.set(coords[0],coords[1],coords[2])
  sphere.add(pin);
  return pin;
}


function LLtoC(lat, lng){
  lat *= Math.PI/180;
  lng *= Math.PI/180;
  let z = -Math.sin(Math.PI/2 - lat) * Math.cos(lng);
  let x = Math.sin(Math.PI/2 - lat) * Math.sin(lng);
  let y = Math.cos(Math.PI/2 - lat);
  return([x,y,z])
}

// let surrey = addPin(49.1913, 122.8490 + 90)
// let calgs = addPin(51.0447, 114.0719 + 90)
// let miami = addPin(25.7617, 80.1918 + 90)

// getCurve(surrey, miami)

function getCurve(pin1,pin2){
  let p1 = pin1.position;
  let p2 = pin2.position;
  let v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
  let v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
  let points = [];
  for(let i = 0; i <= 20; i++){
    let p = new THREE.Vector3().lerpVectors(v1, v2, i/20);
    p.normalize(); //make all points lie on surface of sphere
    p.multiplyScalar(1 + 0.05*Math.sin(Math.PI*i/20))
    points.push(p);
  }

  let path = new THREE.CatmullRomCurve3(points)
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(path, 20, 0.002, 8, false),
    new THREE.MeshBasicMaterial({color: 0x00FF00})
  )
  scene.add(mesh);
}

const API_KEY = "bd89924fb0004515ad776b73189bc523";
// let url = "https://api.ipgeolocation.io/ipgeo?apiKey=" + API_KEY + "&ip=75.154.181.208"
// await fetch(url).then((response) => {
//   //console.log(response.json())
// })

let ips = document.getElementById("ips");
ips = ips.innerHTML.split(",");
ips.unshift('75.154.181.208');

let index = ips.indexOf('Request timed out');
if(index !== -1){
  ips.splice(index,1);
}

var pins = [];

for(let x in ips){
  let url = "https://api.ipgeolocation.io/ipgeo?apiKey=" + API_KEY + "&ip=" + String(ips[x]);
  await fetch(url)
    .then(r => r.json())
    .then(r => {
      //console.log(r)
      let lat = parseInt(r.latitude);
      let lng = Math.abs(parseInt(r.longitude)) + 90;
      console.log(lat + " " + -(lng - 90) + " " + r.city + " " + r.country_name);
      pins.push(addPin(lat,lng));
  })
}

for(let x = 0; x < pins.length - 1; x++){
  getCurve(pins[x], pins[x+1]);
}






function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
  //sphere.rotateY(0.002)
}
animate();
