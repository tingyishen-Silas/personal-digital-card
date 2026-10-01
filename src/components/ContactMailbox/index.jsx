import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AtSign,
  Compass,
  Check,
  Copy,
  Heart,
  Mail,
  MapPin,
  Send,
} from 'lucide-react';
import { contactContent } from '../../data/siteContent';
import useCopyFeedback from '../../useCopyFeedback';

const channelIcons = {
  email: AtSign,
  social: Heart,
  portfolio: Compass,
};

function ContactMailbox() {
  const [isLetterOpen, setIsLetterOpen] = useState(true);
  const mailtoHref = `mailto:${contactContent.address}`;
  const { copy, feedback } = useCopyFeedback();

  return (
    <section className="contact-mailbox relative h-full w-full overflow-hidden p-8 text-sienna">
      <div className="contact-mailbox-wash absolute inset-0" aria-hidden="true" />

      <div className="contact-mailbox-layout relative z-10 grid h-full min-h-0 grid-cols-[0.82fr_1.18fr] gap-8 pr-14">
        <div className="contact-post-stage relative flex min-h-0 flex-col overflow-hidden rounded-[7px] p-6">
          <div className="contact-post-stage-light absolute inset-0" aria-hidden="true" />
          <div className="relative z-10 flex items-center justify-between text-xs text-cream/85">
            <span className="flex items-center gap-2"><Send aria-hidden="true" size={15} strokeWidth={1.7} /> post box no. 01</span>
            <span>to Silas</span>
          </div>

          <div className="contact-post-display relative z-10 flex flex-1 flex-col items-center justify-center">
            <div className="contact-post-halo absolute" aria-hidden="true" />
            <motion.div
              className="contact-mailbox-object relative"
              animate={{ rotate: isLetterOpen ? -1.5 : 1.5, y: isLetterOpen ? -4 : 5 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="contact-mailbox-slot" aria-hidden="true" />
              <motion.div
                className="contact-envelope absolute left-1/2 top-7 z-20 -translate-x-1/2"
                animate={{ y: isLetterOpen ? -46 : 4, rotate: isLetterOpen ? -4 : 0 }}
                transition={{ duration: 0.46, ease: 'easeOut' }}
              >
                <div className="contact-envelope-flap" aria-hidden="true" />
                <span className="contact-envelope-stamp" aria-hidden="true"><Heart size={12} strokeWidth={1.7} /></span>
                <span className="contact-envelope-line first" aria-hidden="true" />
                <span className="contact-envelope-line second" aria-hidden="true" />
              </motion.div>
              <div className="contact-mailbox-door" aria-hidden="true" />
              <div className="contact-mailbox-post" aria-hidden="true" />
              <div className="contact-mailbox-base" aria-hidden="true" />
            </motion.div>

            <div className="contact-post-recipient relative z-30 mt-5 text-center">
              <span className="block text-[10px] uppercase text-cream/55">deliver to</span>
              <span className="mt-1 block font-title text-base text-cream">{contactContent.address}</span>
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between gap-5 text-xs text-cream/90">
            <span className="flex items-center gap-2"><MapPin aria-hidden="true" size={14} strokeWidth={1.7} /> {contactContent.location}</span>
            <a
              className="contact-delivery-button"
              href={mailtoHref}
              aria-label={`写邮件给 ${contactContent.address}`}
              onClick={() => setIsLetterOpen(false)}
            >
              <Send aria-hidden="true" size={16} strokeWidth={1.75} />
              <span>投递一封信</span>
            </a>
          </div>
        </div>

        <article className="contact-letter relative flex min-h-0 flex-col overflow-hidden rounded-[6px] p-7">
          <div className="contact-letter-texture absolute inset-0" aria-hidden="true" />
          <div className="relative z-10 flex items-start justify-between gap-6">
            <div>
              <div className="contact-overline flex items-center gap-2">
                <Mail aria-hidden="true" size={15} strokeWidth={1.7} />
                <span>contact</span>
              </div>
              <h2 className="mt-3 font-title text-[44px] italic leading-none text-sienna">{contactContent.title}</h2>
            </div>
            <span className="contact-seal"><Heart aria-hidden="true" size={16} fill="currentColor" strokeWidth={1.2} /></span>
          </div>

          <p className="contact-introduction relative z-10 mt-8 max-w-md text-[15px] leading-8 text-[#594838]">{contactContent.introduction}</p>

          <a className="contact-letter-send relative z-10" href={mailtoHref} onClick={() => setIsLetterOpen(false)}>
            <Send aria-hidden="true" size={16} />
            <span>投递一封信</span>
          </a>

          <div className="contact-channels relative z-10 mt-7 grid gap-2">
            {contactContent.channels.map((channel, index) => {
              const ChannelIcon = channelIcons[channel.id];
              return (
                <motion.div
                  className="contact-channel"
                  key={channel.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.16 + index * 0.07, duration: 0.35 }}
                >
                  <span className="contact-channel-icon"><ChannelIcon aria-hidden="true" size={16} strokeWidth={1.7} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-taupe">{channel.label} / {channel.hint}</span>
                    {channel.id === 'email' ? (
                      <a className="contact-address mt-0.5 block text-sm text-sienna" href={mailtoHref}>{channel.value}</a>
                    ) : (
                      <span className="mt-0.5 block text-sm text-sienna">{channel.value}</span>
                    )}
                  </span>
                  {(channel.id === 'email' || channel.copyValue) && (
                    <button
                      className="contact-copy-button"
                      type="button"
                      aria-label={channel.id === 'email' ? '复制邮箱' : '复制小红书号'}
                      title={channel.id === 'email' ? '复制邮箱' : '复制小红书号'}
                      onClick={() => copy(channel.id, channel.copyValue || contactContent.address, channel.id === 'email' ? '邮箱' : '小红书号')}
                    >
                      {feedback.id === channel.id ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          <p className="copy-feedback relative z-10" role="status" aria-live="polite">{feedback.message}</p>

          <div className="contact-letter-footer relative z-10 mt-auto flex items-end justify-between gap-6 pt-6">
            <span className="max-w-[17rem] text-sm italic leading-6 text-[#745a42]">{contactContent.note}</span>
            <span className="font-title text-xl italic text-sienna">Silas</span>
          </div>
        </article>
      </div>
    </section>
  );
}

export default ContactMailbox;
