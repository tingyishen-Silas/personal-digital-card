import { motion } from 'framer-motion';
import { Brush, Heart, Palette, Sparkles } from 'lucide-react';
import { aboutContent } from '../../data/siteContent';
import usePointerTilt from '../../usePointerTilt';

function AboutEasel() {
  const { tiltStyle, glareStyle, tiltHandlers } = usePointerTilt(9);

  return (
    <section className="about-easel relative h-full w-full overflow-hidden p-7 text-sienna">
      <div className="about-easel-wash absolute inset-0" aria-hidden="true" />

      <div className="about-easel-layout relative z-10 grid h-full min-h-0 grid-cols-[0.9fr_1.1fr] gap-8">
        <div className="about-easel-art relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[8px] p-6">
          <div className="flex items-center gap-3 text-xs text-taupe">
            <span className="about-symbol"><Palette aria-hidden="true" size={16} strokeWidth={1.7} /></span>
            <span>my little studio</span>
          </div>

          <div className="relative mx-auto flex w-full max-w-[330px] flex-1 items-center justify-center" {...tiltHandlers}>
            <div className="about-easel-legs absolute bottom-2 h-24 w-48" aria-hidden="true" />
            <motion.figure
              className="about-canvas relative z-10 h-[min(29vw,278px)] w-[min(24vw,230px)] min-h-[240px] min-w-[198px] overflow-hidden rounded-[3px] p-3"
              initial={{ opacity: 0, rotate: -2.5, y: 14 }}
              animate={{ opacity: 1, rotate: -1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={tiltStyle}
            >
              <img
                className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] object-cover object-[50%_32%]"
                src={aboutContent.artwork}
                alt={`${aboutContent.name}的油画风肖像`}
              />
              <div className="about-canvas-veil absolute inset-3" />
              <figcaption className="absolute inset-x-6 bottom-7 text-center text-cream">
                <p className="font-title text-[clamp(31px,3.4vw,46px)] italic leading-none">{aboutContent.name.split(' ')[0]}</p>
              </figcaption>
              <span className="about-canvas-mark absolute right-6 top-6"><Brush aria-hidden="true" size={17} strokeWidth={1.6} /></span>
              <motion.span className="tilt-glare absolute inset-3" style={glareStyle} aria-hidden="true" />
            </motion.figure>
          </div>

          <div className="about-signature-row flex items-center gap-3 text-xs text-taupe">
            <span className="font-title text-base italic text-sienna">{aboutContent.fullName}</span>
            <span className="h-px flex-1 bg-taupe/30" aria-hidden="true" />
            <span>{aboutContent.signature}</span>
          </div>
        </div>

        <div className="about-easel-copy flex min-h-0 flex-col py-3 pr-16">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="about-overline flex items-center gap-2">
                <Sparkles aria-hidden="true" size={15} strokeWidth={1.8} />
                <span>About</span>
              </div>
              <h2 className="mt-3 whitespace-nowrap font-title text-[42px] italic leading-none text-sienna">一幅自画像</h2>
            </div>
            <span className="about-role shrink-0 whitespace-nowrap">{aboutContent.role}</span>
          </div>

          <p className="about-introduction mt-7 max-w-[34rem] text-[15px] leading-8 text-[#5c4b3b]">
            {aboutContent.introduction}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {aboutContent.keywords.map((keyword) => (
              <span className="about-keyword" key={keyword}>{keyword}</span>
            ))}
          </div>

          <blockquote className="about-quote mt-auto flex items-start gap-3 pt-6 text-sm italic leading-6 text-sienna">
            <Heart aria-hidden="true" className="mt-0.5 shrink-0" size={16} strokeWidth={1.7} />
            <span>{aboutContent.quote}</span>
          </blockquote>
        </div>
      </div>
    </section>
  );
}

export default AboutEasel;
