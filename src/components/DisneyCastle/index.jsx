import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  ImagePlus,
  Moon,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import { castleContent } from '../../data/siteContent';
import castleWatercolor from '../../assets/castle-watercolor.png';

function DisneyCastle() {
  const [isNight, setIsNight] = useState(true);

  return (
    <section className={`disney-castle relative h-full w-full overflow-hidden p-8 text-sienna ${isNight ? 'is-night' : 'is-day'}`}>
      <div className="castle-sky absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 grid h-full min-h-0 grid-cols-[0.92fr_1.08fr] gap-9 pr-14">
        <div className="castle-stage relative flex min-h-0 flex-col overflow-hidden rounded-[7px] p-6">
          <div className="castle-stars absolute inset-0" aria-hidden="true">
            {[...Array(11)].map((_, index) => (
              <span className="castle-star" key={index} style={{ '--star-index': index }} />
            ))}
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-cream/90">
            <span className="flex items-center gap-2"><Crown aria-hidden="true" size={15} strokeWidth={1.7} /> dream archive</span>
            <div className="castle-light-switch" aria-label="城堡光线">
              <button
                className={!isNight ? 'is-active' : ''}
                type="button"
                aria-label="切换为白天"
                aria-pressed={!isNight}
                onClick={() => setIsNight(false)}
              >
                <Sun aria-hidden="true" size={15} strokeWidth={1.8} />
              </button>
              <button
                className={isNight ? 'is-active' : ''}
                type="button"
                aria-label="切换为夜晚"
                aria-pressed={isNight}
                onClick={() => setIsNight(true)}
              >
                <Moon aria-hidden="true" size={15} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 items-end justify-center pb-7">
            <motion.div
              className="castle-illustration relative"
              animate={{ y: isNight ? [0, -5, 0] : [0, -2, 0] }}
              transition={{ duration: isNight ? 4.6 : 5.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="castle-glow absolute bottom-2 left-1/2 -translate-x-1/2" aria-hidden="true" />
              <img
                className="castle-watercolor relative z-10 h-full w-full object-contain"
                src={castleWatercolor}
                alt="水彩风格的城堡"
              />
            </motion.div>
          </div>

          <span className="relative z-10 text-center font-title text-sm italic text-cream/85">somewhere between dreams and daylight</span>
        </div>

        <article className="castle-journal relative flex min-h-0 flex-col overflow-hidden rounded-[6px] p-7">
          <div className="castle-journal-texture absolute inset-0" aria-hidden="true" />
          <div className="relative z-10 flex items-start justify-between gap-6">
            <div>
              <div className="castle-overline flex items-center gap-2">
                <Sparkles aria-hidden="true" size={15} strokeWidth={1.8} />
                <span>Dream posts</span>
              </div>
              <h2 className="mt-3 font-title text-[44px] italic leading-none text-sienna">{castleContent.title}</h2>
            </div>
            <span className="castle-journal-mark"><Star aria-hidden="true" size={16} fill="currentColor" strokeWidth={1.4} /></span>
          </div>

          <p className="relative z-10 mt-4 max-w-md text-sm leading-6 text-[#594838]">{castleContent.introduction}</p>

          <div className="castle-post-feed relative z-10 mt-5 grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1">
            {castleContent.posts.map((post, index) => {
              const postImage = post.image === 'castle' ? castleWatercolor : post.image;

              return (
                <motion.article
                  className={`castle-post ${post.draft ? 'is-draft' : ''} ${post.featured ? 'is-featured' : ''}`}
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + index * 0.08, duration: 0.35 }}
                >
                  <div className="castle-post-image">
                    {postImage ? (
                      <img src={postImage} alt="" />
                    ) : (
                      <ImagePlus aria-hidden="true" size={21} strokeWidth={1.35} />
                    )}
                  </div>
                  <div className="castle-post-copy">
                    <span className="castle-post-date">{post.date}</span>
                    <h3>{post.title}</h3>
                    {post.summary && <p>{post.summary}</p>}
                  </div>
                </motion.article>
              );
            })}
          </div>

          <p className="castle-closing relative z-10 mt-4 text-sm italic leading-6 text-[#745a42]">{castleContent.closing}</p>
        </article>
      </div>
    </section>
  );
}

export default DisneyCastle;
