import { assetPath } from '../assetPath.js';

export const musicList = [
  {
    id: 'song-04',
    title: '鱼仔',
    artist: '卢广仲',
    mood: '适合悠闲的早晨',
    cover: assetPath('/music/cover-04.jpg'),
    audio: {
      mp3: assetPath('/music/song-04.mp3'),
    },
  },
  {
    id: 'song-06',
    title: 'Simon',
    artist: '周菲戈',
    mood: '适合浪漫的上午',
    cover: assetPath('/music/cover-06.jpg'),
    audio: {
      mp3: assetPath('/music/song-06.mp3'),
    },
  },
  {
    id: 'song-02',
    title: '一口',
    artist: '丁世光',
    mood: '适合休闲的下午',
    cover: assetPath('/music/cover-02.jpg'),
    audio: {
      mp3: assetPath('/music/song-02.mp3'),
    },
  },
  {
    id: 'song-01',
    title: '荔枝',
    artist: '裘德',
    mood: '适合温柔的傍晚',
    cover: assetPath('/music/cover-01.jpg'),
    audio: {
      mp3: assetPath('/music/song-01.mp3'),
    },
  },
  {
    id: 'song-05',
    title: '颜色',
    artist: 'Gareth.T 汤令山',
    mood: '适合忧郁的晚上',
    cover: assetPath('/music/cover-05.jpg'),
    audio: {
      mp3: assetPath('/music/song-05.mp3'),
    },
  },
  {
    id: 'song-03',
    title: '浓缩蓝鲸',
    artist: '裘德',
    mood: '适合静谧的深夜',
    cover: assetPath('/music/cover-03.jpg'),
    audio: {
      mp3: assetPath('/music/song-03.mp3'),
    },
  },
];

export const aboutContent = {
  name: 'Silas',
  fullName: 'Tingyi Shen',
  signature: '把日常收进画里',
  role: '个人数字名片',
  introduction: '你好,我是 Silas。这里收集我正在探索的爱好、正在追逐的方向,以及不想匆忙略过的片刻。',
  quote: '希望每一次相遇,都能留下一点温柔的颜色。',
  keywords: ['沉静思考', '温柔坚定', '自由探索', '长期主义'],
  notes: [
    { label: '最近喜欢的曲风', value: 'R&B 和 爵士' },
    { label: '最近喜欢的角色', value: '迪士尼 · 杰拉多尼' },
    { label: '最近喜欢的艺术风格', value: '印象派' },
    { label: '最近探索的方向', value: 'AI Agent' },
    { label: '最近计划要做的事', value: '看展、旅行、美食' },
  ],
  artwork: assetPath('/portrait-silas-optimized.jpg'),
};

export const topicList = [
  {
    id: 'sound',
    number: '01',
    eyebrow: '最近喜欢的曲风',
    title: 'R&B 和 爵士',
    summary: '在松弛的律动与即兴之间，收集一些能陪伴日常的声音。',
    details: ['柔软的低音线', '随性的一点即兴', '适合慢慢听完'],
  },
  {
    id: 'character',
    number: '02',
    eyebrow: '最近喜欢的角色',
    title: '杰拉多尼',
    summary: '迪士尼里那位爱画画的朋友，让想象力和温柔都有了具体的模样。',
    details: ['迪士尼', '一支画笔', '一点想象力'],
  },
  {
    id: 'art',
    number: '03',
    eyebrow: '最近喜欢的艺术风格',
    title: '印象派',
    summary: '不急着描摹每一笔的边界，而是先记住光线落下时的感受。',
    details: ['光与空气', '可见的笔触', '被留住的瞬间'],
  },
  {
    id: 'agent',
    number: '04',
    eyebrow: '最近探索的方向',
    title: 'AI Agent',
    summary: '好奇智能体如何把想法、工具与行动连接成更自然的工作流。',
    details: ['拆解问题', '连接工具', '持续迭代'],
  },
  {
    id: 'plan',
    number: '05',
    eyebrow: '最近计划要做的事',
    title: '看展、旅行、美食',
    summary: '把日程留一点空白，去看新的作品、走新的路，也尝一些新的味道。',
    details: ['一场展览', '一段旅行', '一顿好饭'],
  },
];

export const contactContent = {
  title: '寄来一封信',
  introduction: '如果有想聊的事，或只是想交换一段最近的见闻，欢迎把信投进这里。',
  note: '慢一点回复也没关系，我会认真读完。',
  address: 'tingyi_shen@163.com',
  location: 'Shanghai, China',
  channels: [
    { id: 'email', label: 'Email', value: 'tingyi_shen@163.com', hint: '最适合认真写一封信' },
    { id: 'social', label: 'Social', value: '南山逸（278704142）', hint: '小红书', copyValue: '278704142' },
    { id: 'portfolio', label: 'Portfolio', value: '正在慢慢整理', hint: '作品集' },
  ],
};

export const castleContent = {
  title: '城堡小记',
  introduction: '把喜欢的瞬间，慢慢存成一张张小帖子。',
  posts: [
    {
      id: 'pudong-art-museum-2026',
      date: '2026 · 上海',
      title: '浦东美术馆',
      summary: '乔治·莫兰迪《独白》展 & 让·努维尔《若无艺术家，建筑亦无存》',
      image: assetPath('/castle/pudong-museum/01-morandi-posters.jpg'),
      featured: true,
      gallery: [
        {
          src: assetPath('/castle/pudong-museum/01-morandi-posters.jpg'),
          alt: '莫兰迪历年展览海报墙',
          caption: '乔治·莫兰迪《独白》展',
        },
        {
          src: assetPath('/castle/pudong-museum/03-still-life-room.jpg'),
          alt: '莫兰迪静物作品与实物并置的展厅',
          caption: '画中静物与真实器物的相遇',
        },
        {
          src: assetPath('/castle/pudong-museum/07-small-work-large-space.jpg'),
          alt: '展墙中央单独陈列的小幅作品',
          caption: '一幅小画与大片留白',
        },
        {
          src: assetPath('/castle/pudong-museum/08-morandi-nameplate.jpg'),
          alt: '乔治·莫兰迪作品铭牌',
          caption: 'Giorgio Morandi, 1890–1964',
        },
        {
          src: assetPath('/castle/pudong-museum/04-vase-dialogue.jpg'),
          alt: '花瓶画作与玻璃展柜中的花瓶',
          caption: '从画布走向展柜的一束花',
        },
        {
          src: assetPath('/castle/pudong-museum/02-morandi-quote-seeing.jpg'),
          alt: '莫兰迪关于看见与描绘的展墙语句',
          caption: '任何事物都可以被描绘，只要真正看见它。',
        },
        {
          src: assetPath('/castle/pudong-museum/09-morandi-quote-nature.jpg'),
          alt: '莫兰迪关于自然与可见世界的展墙语句',
          caption: '表达自然，也表达可见的世界。',
        },
        {
          src: assetPath('/castle/pudong-museum/10-morandi-quote-essence.jpg'),
          alt: '莫兰迪关于触及事物本质的展墙语句',
          caption: '触及核心，触及事物的本质。',
        },
        {
          src: assetPath('/castle/pudong-museum/05-framed-landscape.jpg'),
          alt: '金色画框中的莫兰迪风景作品',
          caption: '被安静色块包围的风景',
        },
        {
          src: assetPath('/castle/pudong-museum/06-etched-landscape.jpg'),
          alt: '莫兰迪蚀刻风景作品',
          caption: '线条里的山坡与树林',
        },
        {
          src: assetPath('/castle/pudong-museum/11-jean-nouvel-entrance.jpg'),
          alt: '让·努维尔展览入口与红色空间',
          caption: '让·努维尔《若无艺术家，建筑亦无存》',
        },
        {
          src: assetPath('/castle/pudong-museum/12-jean-nouvel-projection.jpg'),
          alt: '让·努维尔展厅中的城市影像与工作台',
          caption: '建筑影像与工作现场',
        },
        {
          src: assetPath('/castle/pudong-museum/13-jean-nouvel-light.jpg'),
          alt: '让·努维尔展览中的橙色光影装置',
          caption: '空间、结构与一束橙色的光',
        },
      ],
    },
    {
      id: 'castle-draft-01',
      date: '待补充',
      title: '下一则小记',
      draft: true,
    },
    {
      id: 'castle-draft-02',
      date: '待补充',
      title: '更多片刻',
      draft: true,
    },
  ],
  closing: '以后，这里会慢慢长成一座自己的梦境档案。',
};
