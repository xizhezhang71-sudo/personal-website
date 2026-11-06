// Canonical cross-page robot frames. Keep camera, rig and pose endpoints here
// so Work, profolio, Research and About cannot drift apart.
export const OPENING_IDLE_SCALE = .78;

export const OPENING_FRAME = {
  narrowDistance: 4.72,
  distance: 3.76,
  target: .98,
  cameraPitchDegrees: -26,
  narrowFov: 41,
  fov: 43.5,
  narrowFramingOffset: .084,
  framingOffset: .24,
  rigRotationY: -Math.PI / 6
};

export const SHARED_PAGE_END_FRAME = {
  distance: 6,
  target: 1.1,
  cameraY: .55,
  fov: 35,
  rigFramingOffset: -.16,
  rigRotationY: Math.PI * 2 + .30
};

// Reference composition shared by Research's middle beat and About's ending:
// a close medium shot from slightly above, with the presenting arm on screen.
export const OVERHEAD_MEDIUM_FRAME = {
  distance: 4.05,
  target: 1.45,
  cameraPitchDegrees: 20,
  fov: 35,
  rigFramingOffset: -.16,
  rigRotationY: .30
};

export const WORK_ENDPOINT_LIMB_POSE = {
  Right: {
    wrist: {position:{x:-.70,y:-.70,z:-.30}, rotation:{x:4,y:2,z:-4}},
    palm:  {position:{x:-.69,y:-.08,z: .00}, rotation:{x:-41,y:2,z:6}}
  },
  Left: {
    wrist: {position:{x: .70,y:-.02,z: .34}, rotation:{x:-21,y:-1,z:1}},
    palm:  {position:{x: .70,y:-.70,z: .70}, rotation:{x:2,y:3,z:1}}
  }
};
