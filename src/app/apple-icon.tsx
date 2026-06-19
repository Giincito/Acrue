import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
       <div
        style={{
          background: '#0C0C0B',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="112" height="112" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="15" stroke="#F6F6F3" strokeWidth="1.5" opacity=".20" />
          <circle cx="20" cy="20" r="9" stroke="#F6F6F3" strokeWidth="2" opacity=".55" />
          <circle cx="20" cy="20" r="4" fill="#F6F6F3" />
          <circle cx="29" cy="7.2" r="2.5" fill="#F6F6F3" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
