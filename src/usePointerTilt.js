import { useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';

const SPRING = { stiffness: 180, damping: 18, mass: 0.6 };

// Tilts an object toward a mouse cursor with a varnish-like glare. Touch and
// reduced-motion users simply see the object at rest.
export default function usePointerTilt(maxDegrees = 8) {
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const glareTarget = useMotionValue(0);
  const springX = useSpring(pointerX, SPRING);
  const springY = useSpring(pointerY, SPRING);
  const glareOpacity = useSpring(glareTarget, { stiffness: 120, damping: 20 });
  const rotateY = useTransform(springX, [0, 1], [-maxDegrees, maxDegrees]);
  const rotateX = useTransform(springY, [0, 1], [maxDegrees * 0.8, -maxDegrees * 0.8]);
  const glareX = useTransform(springX, [0, 1], ['10%', '90%']);
  const glareY = useTransform(springY, [0, 1], ['5%', '95%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255, 244, 220, 0.4), rgba(255, 244, 220, 0) 55%)`;

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
    glareTarget.set(1);
  };

  const onPointerLeave = () => {
    pointerX.set(0.5);
    pointerY.set(0.5);
    glareTarget.set(0);
  };

  return {
    tiltStyle: { rotateX, rotateY, transformPerspective: 900 },
    glareStyle: { backgroundImage: glare, opacity: glareOpacity },
    tiltHandlers: { onPointerMove, onPointerLeave },
  };
}
