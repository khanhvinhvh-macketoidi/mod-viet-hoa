import type { CSSProperties } from 'react';

export type AvatarRankTier =
  | 'PHAM_NHAN'
  | 'NHAN_KIET'
  | 'THIEN_KIEU'
  | 'THAN_THOAI';

export type RankAsset = {
  src: string;
  alt?: string;
  size?: number | string;
};

export type RankLayerGeometry = {
  left: number;
  top: number;
  width?: number;
  height?: number;
  size?: number;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  scale?: number;
  opacity?: number;
};

export type RankPhotoGeometry = {
  left: number;
  top: number;
  size: number;
  positionX: number;
  positionY: number;
  scale: number;
};

export type RankFrameConfig =
  | {
      mode: 'image';
      asset: RankAsset;
      geometry: RankLayerGeometry;
    }
  | {
      mode: 'css';
      asset?: RankAsset;
      geometry: RankLayerGeometry;
      sealText: string;
    };

export type RankBadgeConfig = {
  asset: RankAsset;
  geometry: RankLayerGeometry;
  textOverlay?: {
    text: string;
    offsetX?: number;
    offsetY?: number;
  };
};

export type AvatarRankConfig = {
  tier: AvatarRankTier;
  slug: string;
  displayName: string;
  shortName: string;
  className: string;
  photo: RankPhotoGeometry;
  frame: RankFrameConfig;
  badge: RankBadgeConfig;
  icon: {
    asset: RankAsset;
    geometry: RankLayerGeometry;
  };
  glow: {
    asset: RankAsset;
    geometry: RankLayerGeometry;
  };
  effects: {
    particles: boolean;
    breathe: boolean;
    intensity: number;
  };
  theme: {
    main: string;
    soft: string;
    text: string;
    panelFrom: string;
    panelTo: string;
  };
};

const ROOT = "/images/avatar-ranks/v32final";
const ASSET_VERSION = "p32-final-20260721";

function asset(filename: string): RankAsset {
  return {
    src: `${ROOT}/${filename}?v=${ASSET_VERSION}`,
  };
}

const DEFAULT_ICON_GEOMETRY: RankLayerGeometry = {
  left: 0,
  top: 0,
  scale: 1,
};

const DEFAULT_GLOW_GEOMETRY: RankLayerGeometry = {
  left: 5,
  top: 68.5,
  width: 90,
  height: 30,
  opacity: 0.3,
};

/**
 * P3.2 Final Patch
 *
 * - `photo` controls the square avatar window only.
 * - `frame`, `badge`, `glow`, and `icon` are independent visual layers.
 * - Keep asset files inside: public/images/avatar-ranks/v32final/
 */
export const AVATAR_RANKS: Record<AvatarRankTier, AvatarRankConfig> = {
  PHAM_NHAN: {
    tier: 'PHAM_NHAN',
    slug: 'pham-nhan',
    displayName: 'Phàm Nhân',
    shortName: 'PHÀM',
    className: 'avatar-rank--member',

    photo: {
      left: 15,
      top: 11.8,
      size: 76,
      positionX: 50,
      positionY: 39,
      scale: 1,
    },

    frame: {
      mode: 'image',
      asset: asset('member-frame.png'),
      geometry: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      },
    },

    badge: {
      asset: asset('member-badge-original.png'),
      geometry: {
        left: 26.5,
        top: 80,
        width: 50,
        height: 50,
        size: 500,
        offsetY: 5,
        offsetZ: 5,
      },
    },

    icon: {
      asset: asset('member-icon.png'),
      geometry: DEFAULT_ICON_GEOMETRY,
    },

    glow: {
      asset: asset('member-glow.png'),
      geometry: {
        ...DEFAULT_GLOW_GEOMETRY,
        left: 1,
        top: -77,
        width: 200,
        height: 200,
        size: 100,
        opacity: 0.32,
        offsetZ: 0,
      },
    },

    effects: {
      particles: false,
      breathe: false,
      intensity: 0.25,
    },

    theme: {
      main: '#aa8158',
      soft: '#5d4634',
      text: '#dfbf98',
      panelFrom: 'rgba(91, 70, 52, 0.30)',
      panelTo: 'rgba(3, 13, 25, 0.92)',
    },
  },

  NHAN_KIET: {
    tier: 'NHAN_KIET',
    slug: 'nhan-kiet',
    displayName: 'Nhân Kiệt',
    shortName: 'KIỆT',
    className: 'avatar-rank--nhan-kiet',

    photo: {
      left: 15,
      top: 11.8,
      size: 76,
      positionX: 50,
      positionY: 39,
      scale: 1,
    },

    frame: {
      mode: 'image',
      asset: asset('nhan-kiet-frame.png'),
      geometry: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        offsetZ: 5,
      },
    },

    badge: {
      asset: asset('nhan-kiet-badge.png'),
      geometry: {
        left: 26.5,
        top: 80,
        width: 50,
        height: 50,
        size: 100,
        offsetY: 5,
        offsetZ: 5,
      },
    },

    icon: {
      asset: asset('nhan-kiet-icon.png'),
      geometry: DEFAULT_ICON_GEOMETRY,
    },

    glow: {
      asset: asset('nhan-kiet-glow.png'),
      geometry: {
        ...DEFAULT_GLOW_GEOMETRY,
        left: 1,
        top: -77,
        width: 200,
        height: 200,
        size: 100,
        opacity: 0.32,
        offsetZ: 0,
      },
    },

    effects: {
      particles: true,
      breathe: true,
      intensity: 0.55,
    },

    theme: {
      main: '#8edcff',
      soft: '#266b89',
      text: '#d9f5ff',
      panelFrom: 'rgba(38, 107, 137, 0.24)',
      panelTo: 'rgba(3, 13, 25, 0.92)',
    },
  },

  THIEN_KIEU: {
    tier: 'THIEN_KIEU',
    slug: 'thien-kieu',
    displayName: 'Thiên Kiêu',
    shortName: 'KIÊU',
    className: 'avatar-rank--thien-kieu',

    photo: {
      left: 15,
      top: 11.8,
      size: 76,
      positionX: 50,
      positionY: 39,
      scale: 1,
    },

    frame: {
      mode: 'image',
      asset: asset('thien-kieu-frame.png'),
      geometry: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        offsetZ: 5,
      },
    },

    badge: {
      asset: asset('thien-kieu-badge.png'),
      geometry: {
        left: 26,
        top: 80,
        width: 50,
        height: 50,
        size: 100,
        offsetY: 5,
        offsetZ: 5,
      },
    },

    icon: {
      asset: asset('thien-kieu-icon.png'),
      geometry: DEFAULT_ICON_GEOMETRY,
    },

    glow: {
      asset: asset('thien-kieu-glow.png'),
      geometry: {
        ...DEFAULT_GLOW_GEOMETRY,
        left: -1,
        top: -77,
        width: 200,
        height: 200,
        size: 100,
        opacity: 0.43,
        offsetZ: 0,
      },
    },

    effects: {
      particles: true,
      breathe: true,
      intensity: 0.75,
    },

    theme: {
      main: '#e8b349',
      soft: '#80540f',
      text: '#ffe191',
      panelFrom: 'rgba(128, 84, 15, 0.26)',
      panelTo: 'rgba(3, 13, 25, 0.92)',
    },
  },

  THAN_THOAI: {
    tier: 'THAN_THOAI',
    slug: 'than-thoai',
    displayName: 'Thần Thoại',
    shortName: 'THẦN',
    className: 'avatar-rank--than-thoai',

    photo: {
      left: 11.5,
      top: 14.8,
      size: 74,
      positionX: 50,
      positionY: 39,
      scale: 1,
    },

    frame: {
      mode: 'image',
      asset: asset('than-thoai-frame.png'),
      geometry: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        offsetZ: 5,
      },
    },

    badge: {
      asset: asset('than-thoai-badge.png'),
      geometry: {
        left: 20,
        top: 76,
        width: 55,
        height: 55,
        size: 100,
        offsetY: 5,
        offsetZ: 5,
      },
    },

    icon: {
      asset: asset('than-thoai-icon.png'),
      geometry: DEFAULT_ICON_GEOMETRY,
    },

    glow: {
      asset: asset('than-thoai-glow.png'),
      geometry: {
        ...DEFAULT_GLOW_GEOMETRY,
        left: -2,
        top: -80,
        width: 200,
        height: 200,
        size: 100,
        opacity: 0.54,
        offsetZ: 0,
      },
    },

    effects: {
      particles: true,
      breathe: true,
      intensity: 1,
    },

    theme: {
      main: '#ff543d',
      soft: '#7f1014',
      text: '#ffad9d',
      panelFrom: 'rgba(127, 16, 20, 0.27)',
      panelTo: 'rgba(3, 13, 25, 0.92)',
    },
  },
};

export function getAvatarRankConfig(
  tier: AvatarRankTier,
): AvatarRankConfig {
  return AVATAR_RANKS[tier] ?? AVATAR_RANKS.PHAM_NHAN;
}

export function getAvatarRankStyle(
  config: AvatarRankConfig,
): CSSProperties {
  const frame = config.frame.geometry;
  const badge = config.badge.geometry;
  const glow = config.glow.geometry;

  return {
    '--rank-main': config.theme.main,
    '--rank-soft': config.theme.soft,
    '--rank-text': config.theme.text,
    '--rank-panel-from': config.theme.panelFrom,
    '--rank-panel-to': config.theme.panelTo,

    '--photo-left': `${config.photo.left}%`,
    '--photo-top': `${config.photo.top}%`,
    '--photo-size': `${config.photo.size}%`,
    '--photo-position-x': `${config.photo.positionX}%`,
    '--photo-position-y': `${config.photo.positionY}%`,
    '--photo-scale': String(config.photo.scale),

    '--frame-left': `${frame.left}%`,
    '--frame-top': `${frame.top}%`,
    '--frame-width': `${frame.width}%`,
    '--frame-height': `${frame.height ?? frame.width}%`,
    '--frame-scale': String(frame.scale ?? 1),

    '--badge-left': `${badge.left}%`,
    '--badge-top': `${badge.top}%`,
    '--badge-width': `${badge.width}%`,
    '--badge-height': `${badge.height ?? 15}%`,
    '--badge-offset-x': `${badge.offsetX ?? 0}px`,
    '--badge-offset-y': `${badge.offsetY ?? 0}px`,
    '--badge-scale': String(badge.scale ?? 1),

    '--glow-left': `${glow.left}%`,
    '--glow-top': `${glow.top}%`,
    '--glow-width': `${glow.width}%`,
    '--glow-height': `${glow.height ?? 30}%`,
    '--glow-opacity': String(glow.opacity ?? 0.3),
    '--glow-scale': String(glow.scale ?? 1),

    '--rank-effect-intensity': String(
      config.effects.intensity,
    ),
  } as CSSProperties;
}