export type Track = {
  title: string;
  artist: string;
  album: string;
  duration: string;
};

export type Playlist = {
  id: string;
  title: string;
  description: string;
  owner: string;
  image: string;
  followers: string;
  totalDuration: string;
  tracks: Track[];
};

export const playlists: Playlist[] = [
  {
    id: 'midnight-drive',
    title: 'Midnight Drive',
    description: '街の灯りが流れていく、深夜のドライブサウンド。',
    owner: 'Studio Sessions',
    image: '/images/playlist-01.svg',
    followers: '28,412',
    totalDuration: '42分',
    tracks: [
      { title: 'Neon Lines', artist: 'Night Arcade', album: 'After Hours', duration: '3:42' },
      { title: 'Soft Focus', artist: 'Lumen', album: 'Blue Exposure', duration: '4:08' },
      { title: 'City Sleeps', artist: 'Satellite Youth', album: 'Slow Motion', duration: '3:26' },
      { title: 'Passing Lights', artist: 'Mono Lake', album: 'Northbound', duration: '4:31' },
      { title: 'No Signal', artist: 'Glass Taxi', album: 'Frequency', duration: '3:18' },
      { title: 'Moonroof', artist: 'Vela', album: 'Open Roads', duration: '4:04' },
      { title: 'Last Exit', artist: 'Paper Planes', album: 'Anywhere Else', duration: '3:55' },
      { title: 'Dawn FM', artist: 'Coastline', album: 'First Light', duration: '4:22' },
    ],
  },
  {
    id: 'morning-bloom',
    title: 'Morning Bloom',
    description: 'コーヒーと朝の光に似合う、穏やかなインディーポップ。',
    owner: 'Daily Selects',
    image: '/images/playlist-02.svg',
    followers: '16,905',
    totalDuration: '39分',
    tracks: [
      { title: 'New Day', artist: 'Mellow Fields', album: 'Sunday Sun', duration: '3:16' },
      { title: 'Apricot Sky', artist: 'June & Ivy', album: 'Garden Songs', duration: '3:48' },
      { title: 'Window Seat', artist: 'Common Hours', album: 'At Home', duration: '4:02' },
      { title: 'Small Talk', artist: 'The Linens', album: 'Easy Living', duration: '3:34' },
      { title: 'Green Tea', artist: 'Sora Lane', album: 'Quiet Mornings', duration: '3:59' },
      { title: 'Open Curtains', artist: 'Daylight Club', album: 'Room Tone', duration: '4:11' },
      { title: 'Soft Landing', artist: 'Harbor Kids', album: 'Coming Home', duration: '3:37' },
      { title: 'First Train', artist: 'Mina Park', album: 'City Garden', duration: '4:25' },
    ],
  },
  {
    id: 'deep-current',
    title: 'Deep Current',
    description: '深く潜るための、ミニマルで流動的なエレクトロニカ。',
    owner: 'Signal Flow',
    image: '/images/playlist-03.svg',
    followers: '43,120',
    totalDuration: '47分',
    tracks: [
      { title: 'Pressure', artist: 'Abyssal', album: 'Below', duration: '5:01' },
      { title: 'Undertow', artist: 'Kinetic Blue', album: 'Current State', duration: '4:44' },
      { title: 'Halocline', artist: 'Depth Map', album: 'Lower Layer', duration: '5:12' },
      { title: 'Still Water', artist: 'Forma', album: 'Surface Tension', duration: '4:36' },
      { title: 'Biolume', artist: 'Pelagic', album: 'Night Dive', duration: '5:28' },
      { title: 'Echo Chamber', artist: 'Submerge', album: 'Pressure System', duration: '4:19' },
      { title: 'Blue Noise', artist: 'Rift', album: 'Ocean Floor', duration: '5:06' },
      { title: 'Resurface', artist: 'Aerial', album: 'Air / Water', duration: '4:48' },
    ],
  },
  {
    id: 'golden-hour',
    title: 'Golden Hour',
    description: '一日の終わりを包む、暖かなソウルとR&B。',
    owner: 'Velvet Radio',
    image: '/images/playlist-04.svg',
    followers: '31,778',
    totalDuration: '44分',
    tracks: [
      { title: 'Honey Light', artist: 'Amara Stone', album: 'Amber', duration: '3:51' },
      { title: 'Slow Dance', artist: 'The Parlour', album: 'Close Enough', duration: '4:23' },
      { title: 'Sundown', artist: 'Marcel Grey', album: 'Warm Tones', duration: '4:02' },
      { title: 'Stay Awhile', artist: 'Nia Rose', album: 'Soft Spoken', duration: '3:47' },
      { title: 'Velvet Sky', artist: 'Common Gold', album: 'Late Summer', duration: '4:36' },
      { title: 'Side by Side', artist: 'June Ellis', album: 'Homebody', duration: '3:58' },
      { title: 'Afterglow', artist: 'Sol Avenue', album: 'Long Shadows', duration: '4:15' },
      { title: 'Night Comes Easy', artist: 'Eden Row', album: 'Porch Light', duration: '4:41' },
    ],
  },
];
