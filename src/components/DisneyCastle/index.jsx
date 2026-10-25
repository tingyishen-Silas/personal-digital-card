import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  ImagePlus,
  Images,
  ImageOff,
  Moon,
  Sparkles,
  Star,
  Sun,
  Share2,
} from 'lucide-react';
import { castleContent } from '../../data/siteContent';
import castleWatercolor from '../../assets/castle-watercolor.png';
import { getSwipeDirection } from '../../galleryNavigation';
import useCopyFeedback from '../../useCopyFeedback';

function DisneyCastle({ onArchiveChange, archivePostId, archiveImageIndex = 0, onOpenArchive, onCloseArchive, onArchiveImageChange }) {
  const [isNight, setIsNight] = useState(true);
  const [archiveHost, setArchiveHost] = useState(null);
  const [imageError, setImageError] = useState(false);
  const sectionRef = useRef(null);
  const archiveRef = useRef(null);
  const archiveTriggerRef = useRef(null);
  const swipeStartRef = useRef(null);
  const thumbnailsRef = useRef(null);
  const shouldRestoreArchiveFocusRef = useRef(false);
  const { copy, feedback } = useCopyFeedback();
  const publishedPosts = castleContent.posts.filter((post) => !post.draft);
  const selectedPost = publishedPosts.find((post) => post.id === archivePostId) || null;
  const selectedImageIndex = archiveImageIndex;
  const selectedGallery = selectedPost?.gallery || [];
  const selectedImage = selectedGallery[selectedImageIndex];

  const openArchive = (post, trigger) => {
    archiveTriggerRef.current = trigger;
    onOpenArchive(post.id);
  };

  const closeArchive = useCallback(() => {
    shouldRestoreArchiveFocusRef.current = true;
    onCloseArchive();
  }, [onCloseArchive]);

  const showPreviousImage = useCallback(() => {
    onArchiveImageChange((selectedImageIndex - 1 + selectedGallery.length) % selectedGallery.length);
  }, [onArchiveImageChange, selectedGallery.length, selectedImageIndex]);

  const showNextImage = useCallback(() => {
    onArchiveImageChange((selectedImageIndex + 1) % selectedGallery.length);
  }, [onArchiveImageChange, selectedGallery.length, selectedImageIndex]);

  useEffect(() => {
    setArchiveHost(sectionRef.current?.parentElement);
  }, []);

  useEffect(() => {
    setImageError(false);
    if (!selectedGallery.length) return;
    // Warm both neighbours so swiping either way shows the photo at once.
    [1, -1].forEach((step) => {
      const neighbour = new Image();
      neighbour.src = selectedGallery[(selectedImageIndex + step + selectedGallery.length) % selectedGallery.length].src;
    });
    thumbnailsRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedGallery, selectedImageIndex]);

  useEffect(() => {
    onArchiveChange?.(Boolean(selectedPost));

    if (!selectedPost && shouldRestoreArchiveFocusRef.current) {
      const focusTimer = window.setTimeout(() => {
        archiveTriggerRef.current?.focus();
        shouldRestoreArchiveFocusRef.current = false;
      }, 360);
      return () => window.clearTimeout(focusTimer);
    }

    return undefined;
  }, [onArchiveChange, selectedPost]);

  useEffect(() => {
    if (!selectedPost) return undefined;

    const focusTimer = window.requestAnimationFrame(() => {
      archiveRef.current?.querySelector('[data-archive-return]')?.focus();
    });
    return () => window.cancelAnimationFrame(focusTimer);
  }, [archiveHost, selectedPost]);

  useEffect(() => {
    if (!selectedPost) return undefined;
    const handleKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select')) return;
      if (!['Escape', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') closeArchive();
      else if (event.key === 'ArrowLeft') showPreviousImage();
      else showNextImage();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [closeArchive, selectedPost, showNextImage, showPreviousImage]);

  return (
    <section ref={sectionRef} className={`disney-castle relative h-full w-full overflow-hidden p-8 text-sienna ${isNight ? 'is-night' : 'is-day'}`}>
      <div className="castle-sky absolute inset-0" aria-hidden="true" />

      <div inert={Boolean(selectedPost)} className="castle-main-layout relative z-10 grid h-full min-h-0 grid-cols-[0.92fr_1.08fr] gap-9 pr-14">
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

          <div className="castle-stage-display relative z-10 flex flex-1 items-end justify-center pb-7">
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
          <div className="castle-journal-header relative z-10 flex items-start justify-between gap-6">
            <div>
              <div className="castle-overline flex items-center gap-2">
                <Sparkles aria-hidden="true" size={15} strokeWidth={1.8} />
                <span>Dream posts</span>
              </div>
              <h2 className="mt-3 font-title text-[44px] italic leading-none text-sienna">{castleContent.title}</h2>
            </div>
            <span className="castle-journal-mark"><Star aria-hidden="true" size={16} fill="currentColor" strokeWidth={1.4} /></span>
          </div>

          <p className="castle-journal-introduction relative z-10 mt-4 max-w-md text-sm leading-6 text-[#594838]">{castleContent.introduction}</p>

          <div className="castle-post-feed relative z-10 mt-5 grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1">
            {publishedPosts.map((post, index) => {
              const postImage = post.image === 'castle' ? castleWatercolor : post.image;
              const PostElement = post.gallery ? motion.button : motion.article;

              return (
                <PostElement
                  className={`castle-post ${post.draft ? 'is-draft' : ''} ${post.featured ? 'is-featured' : ''} ${post.gallery ? 'is-openable' : ''}`}
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + index * 0.08, duration: 0.35 }}
                  {...(post.gallery ? {
                    type: 'button',
                    onClick: (event) => openArchive(post, event.currentTarget),
                    'aria-label': `打开档案：${post.title}`,
                  } : {})}
                >
                  <div className="castle-post-image">
                    {postImage ? (
                      <img src={postImage} alt={post.gallery ? `${post.title}档案封面` : ''} />
                    ) : (
                      <ImagePlus aria-hidden="true" size={21} strokeWidth={1.35} />
                    )}
                  </div>
                  <div className="castle-post-copy">
                    <span className="castle-post-date">{post.date}</span>
                    <h3>{post.title}</h3>
                    {post.summary && <p>{post.summary}</p>}
                    {post.gallery && (
                      <span className="castle-post-open-hint">
                        <Images aria-hidden="true" size={12} strokeWidth={1.7} />
                        {post.gallery.length} 张照片
                      </span>
                    )}
                  </div>
                </PostElement>
              );
            })}
          </div>

          <p className="castle-closing relative z-10 mt-4 text-sm italic leading-6 text-[#745a42]">{castleContent.closing}</p>
        </article>
      </div>

      {archiveHost && createPortal(<AnimatePresence>
        {selectedPost && selectedImage && (
          <motion.div
            className="castle-archive-backdrop absolute inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeArchive();
            }}
          >
            <motion.section
              ref={archiveRef}
              className="castle-archive-panel absolute z-40 flex min-h-0 flex-col overflow-hidden"
              data-modal-focus-scope
              aria-label={`${selectedPost.title}档案`}
              initial={{ opacity: 0, scale: 0.97, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, y: 8, filter: 'blur(6px)' }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
            >
              <header className="castle-archive-header flex items-center justify-between gap-5">
                <button className="castle-archive-back" data-archive-return type="button" onClick={closeArchive}>
                  <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.7} />
                  <span>返回小记</span>
                </button>
                <div className="archive-header-actions">
                <span className="castle-archive-count" aria-live="polite" aria-atomic="true">
                  {String(selectedImageIndex + 1).padStart(2, '0')} / {String(selectedGallery.length).padStart(2, '0')}
                </span>
                <button
                  className="archive-share-button"
                  type="button"
                  aria-label="复制相册链接"
                  title={feedback.id === 'archive' ? '链接已复制' : '复制相册链接'}
                  onClick={() => copy('archive', window.location.href, '相册链接')}
                >
                  {feedback.id === 'archive' ? <Check aria-hidden="true" size={17} /> : <Share2 aria-hidden="true" size={17} />}
                </button>
                </div>
              </header>
              <p className="sr-only" role="status">{feedback.message}</p>

              <div className="castle-archive-layout grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_248px] gap-5">
                <figure
                  className="castle-archive-viewer relative min-h-0 overflow-hidden"
                  onPointerDown={(event) => {
                    if (!event.isPrimary || event.target.closest('button')) {
                      swipeStartRef.current = null;
                      return;
                    }
                    event.currentTarget.setPointerCapture(event.pointerId);
                    swipeStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
                  }}
                  onPointerCancel={() => { swipeStartRef.current = null; }}
                  onPointerUp={(event) => {
                    const start = swipeStartRef.current;
                    swipeStartRef.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    if (!start || start.pointerId !== event.pointerId) return;
                    const direction = getSwipeDirection(start, { x: event.clientX, y: event.clientY });
                    if (direction > 0) showNextImage();
                    else if (direction < 0) showPreviousImage();
                  }}
                >
                  {imageError ? (
                    <div className="archive-image-error" role="status">
                      <ImageOff aria-hidden="true" size={28} />
                      <p>照片暂时无法加载</p>
                      <button type="button" onClick={() => setImageError(false)}>重试</button>
                    </div>
                  ) : (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={selectedImage.src}
                      src={selectedImage.src}
                      alt={selectedImage.alt}
                      draggable="false"
                      onError={() => setImageError(true)}
                      initial={{ opacity: 0, scale: 1.018 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                    />
                  </AnimatePresence>
                  )}

                  <button
                    className="castle-gallery-arrow is-previous"
                    type="button"
                    aria-label="上一张照片"
                    onClick={showPreviousImage}
                  >
                    <ChevronLeft aria-hidden="true" size={19} strokeWidth={1.8} />
                  </button>
                  <button
                    className="castle-gallery-arrow is-next"
                    type="button"
                    aria-label="下一张照片"
                    onClick={showNextImage}
                  >
                    <ChevronRight aria-hidden="true" size={19} strokeWidth={1.8} />
                  </button>

                  <figcaption>{selectedImage.caption}</figcaption>
                </figure>

                <aside className="castle-archive-sidebar flex min-h-0 flex-col">
                  <div className="castle-archive-meta">
                    <span className="flex items-center gap-2 text-[10px] uppercase text-taupe">
                      <Images aria-hidden="true" size={13} strokeWidth={1.7} /> memory archive
                    </span>
                    <h2>{selectedPost.title}</h2>
                    <p>{selectedPost.summary}</p>
                  </div>

                  <div ref={thumbnailsRef} className="castle-archive-thumbnails mt-4 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1">
                    {selectedGallery.map((image, index) => (
                      <button
                        className={index === selectedImageIndex ? 'is-active' : ''}
                        type="button"
                        aria-label={`查看第 ${index + 1} 张：${image.caption}`}
                        aria-pressed={index === selectedImageIndex}
                        key={image.src}
                        onClick={() => onArchiveImageChange(index)}
                      >
                        <img src={image.src} alt="" loading="lazy" />
                        <span>{String(index + 1).padStart(2, '0')}</span>
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>, archiveHost)}
    </section>
  );
}

export default DisneyCastle;
