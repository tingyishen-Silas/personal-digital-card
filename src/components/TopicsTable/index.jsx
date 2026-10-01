import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  ChevronDown,
  Coffee,
  MapPinned,
  Music2,
  Palette,
  Sparkles,
} from 'lucide-react';
import { topicList } from '../../data/siteContent';

const topicIcons = {
  sound: Music2,
  character: Sparkles,
  art: Palette,
  agent: Bot,
  plan: MapPinned,
};

function TopicCopy({ topic }) {
  return (
    <>
      {topic.date && <time className="topic-date" dateTime={topic.date}>{topic.date}</time>}
      <p className="topic-summary">{topic.summary}</p>
      <div className="topic-detail-tags">
        {topic.details.map((detail) => <span className="topic-detail-tag" key={detail}>{detail}</span>)}
      </div>
    </>
  );
}

function TopicsTable() {
  const [activeTopicId, setActiveTopicId] = useState(topicList[0].id);
  const activeTopic = topicList.find((topic) => topic.id === activeTopicId) || topicList[0];
  const ActiveIcon = topicIcons[activeTopic.id];

  return (
    <section className="topics-table relative h-full w-full overflow-hidden p-8 text-sienna">
      <div className="topics-table-glow absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 grid h-full min-h-0 grid-cols-[0.9fr_1.1fr] gap-8 pr-14">
        <div className="flex min-h-0 flex-col">
          <div className="topics-overline flex items-center gap-2">
            <Coffee aria-hidden="true" size={16} strokeWidth={1.75} />
            <span>table notes</span>
          </div>
          <h2 className="mt-3 font-title text-[44px] italic leading-none text-sienna">桌上话题</h2>
          <p className="mt-3 max-w-xs text-sm leading-6 text-[#695643]">把最近的心情与方向，摊开聊聊。</p>

          <div className="topic-note-list mt-6 grid gap-2">
            {topicList.map((topic, index) => {
              const Icon = topicIcons[topic.id];
              const isActive = topic.id === activeTopicId;

              return (
                <div className="topic-entry" key={topic.id}>
                <motion.button
                  className={`topic-note ${isActive ? 'is-active' : ''}`}
                  type="button"
                  aria-expanded={isActive}
                  aria-controls={`topic-inline-${topic.id}`}
                  onClick={() => setActiveTopicId(
                    isActive && window.matchMedia('(max-width: 860px)').matches ? null : topic.id,
                  )}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.055, duration: 0.35 }}
                  whileHover={{ x: 5, rotate: index % 2 === 0 ? -0.4 : 0.4 }}
                  whileTap={{ scale: 0.985 }}
                >
                  <span className="topic-note-number">{topic.number}</span>
                  <Icon aria-hidden="true" className="topic-note-icon" size={17} strokeWidth={1.7} />
                  <span className="min-w-0 text-left">
                    <span className="block text-xs text-taupe">{topic.eyebrow}</span>
                    <span className="block truncate font-title text-[19px] italic leading-5 text-sienna">{topic.title}</span>
                  </span>
                  <ChevronDown className="topic-expand-icon" aria-hidden="true" size={16} />
                </motion.button>
                <div
                  className="topic-detail-inline"
                  id={`topic-inline-${topic.id}`}
                  hidden={!isActive}
                >
                  <TopicCopy topic={topic} />
                </div>
                </div>
              );
            })}
          </div>
        </div>

        <motion.article
          className="topic-detail topic-detail-desktop relative flex min-h-0 flex-col overflow-hidden rounded-[7px] p-7"
          key={activeTopic.id}
          initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <div className="topic-detail-wash absolute inset-0" aria-hidden="true" />
          <div className="relative z-10 flex items-start justify-between gap-6">
            <span className="topic-detail-number">{activeTopic.number}</span>
            <span className="topic-detail-icon"><ActiveIcon aria-hidden="true" size={25} strokeWidth={1.45} /></span>
          </div>

          <div className="relative z-10 mt-auto">
            <span className="text-xs text-taupe">{activeTopic.eyebrow}</span>
            <h3 className="mt-2 font-title text-[42px] italic leading-tight text-sienna">{activeTopic.title}</h3>
            <TopicCopy topic={activeTopic} />
          </div>

          <span className="topic-detail-signature relative z-10 mt-8">Silas' current notes</span>
        </motion.article>
      </div>
    </section>
  );
}

export default TopicsTable;
