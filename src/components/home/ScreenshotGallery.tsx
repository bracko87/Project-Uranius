/**
 * ScreenshotGallery.tsx
 * Homepage screenshot gallery with pagination controls and image popup.
 */

import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ScreenshotItem = {
  src: string
  index: number
}

const SCREENSHOT_URLS = [
  '/assets/uranius-placeholders/gallery.png?id=1020421ab00bca39',
  '/assets/uranius-placeholders/gallery.png?id=2df620ba9ad12403',
  '/assets/uranius-placeholders/gallery.png?id=8384ae3de28e6207',
  '/assets/uranius-placeholders/gallery.png?id=1a5087cf22d8a1e7',
  '/assets/uranius-placeholders/gallery.png?id=7d8831a4eb1f9c0e',
  '/assets/uranius-placeholders/gallery.png?id=9d59d5b235a28d55',
  '/assets/uranius-placeholders/gallery.png?id=adff8ebc77e98c2a',
  '/assets/uranius-placeholders/gallery.png?id=fb4a037dad9f3bc6',
  '/assets/uranius-placeholders/gallery.png?id=ea9ede5a58605301',
  '/assets/uranius-placeholders/gallery.png?id=1831e1f814bfa4db',
  '/assets/uranius-placeholders/gallery.png?id=415dc14c43e58ccf',
  '/assets/uranius-placeholders/gallery.png?id=a4aab0292ff5dbe3',
  '/assets/uranius-placeholders/gallery.png?id=39c60c479e702d5a',
  '/assets/uranius-placeholders/gallery.png?id=63fed73a0aefc5ef',
  '/assets/uranius-placeholders/gallery.png?id=dad5841f50cdc551',
  '/assets/uranius-placeholders/gallery.png?id=23b334c0a34c9ffc',
  '/assets/uranius-placeholders/gallery.png?id=5d65bbb2fbdff8bc',
  '/assets/uranius-placeholders/gallery.png?id=255b090521bf927d',
  '/assets/uranius-placeholders/gallery.png?id=cce7c7ad7187a2ac',
  '/assets/uranius-placeholders/gallery.png?id=9ea13adc6b0a5e26',
  '/assets/uranius-placeholders/gallery.png?id=6b5d16764d2895a8',
  '/assets/uranius-placeholders/gallery.png?id=3394a354a490a183',
  '/assets/uranius-placeholders/gallery.png?id=4491f0f82168ab1e',
  '/assets/uranius-placeholders/gallery.png?id=327fb20caa5094c7',
  '/assets/uranius-placeholders/gallery.png?id=afca33aa65e660cd',
  '/assets/uranius-placeholders/gallery.png?id=9d4a02f331798d0c',
  '/assets/uranius-placeholders/gallery.png?id=b1f43a1b3d68f6fa',
  '/assets/uranius-placeholders/gallery.png?id=2220905813bdf822',
  '/assets/uranius-placeholders/gallery.png?id=4182e64b0d2a3950',
  '/assets/uranius-placeholders/gallery.png?id=02378eaf7f0131ca',
  '/assets/uranius-placeholders/gallery.png?id=db7d1b9b45e4459e',
  '/assets/uranius-placeholders/gallery.png?id=f40badab667262d6',
  '/assets/uranius-placeholders/gallery.png?id=14a4456c3342a315',
  '/assets/uranius-placeholders/gallery.png?id=3a29057cbec31858',
  '/assets/uranius-placeholders/gallery.png?id=f59dfe50c7458592',
  '/assets/uranius-placeholders/gallery.png?id=b6471f1cad708cfb',
  '/assets/uranius-placeholders/gallery.png?id=c5ebde734cf7d2c8',
  '/assets/uranius-placeholders/gallery.png?id=a0d6d9d05f6983d4',
  '/assets/uranius-placeholders/gallery.png?id=75d1f598ac0e3925',
  '/assets/uranius-placeholders/gallery.png?id=4bde29ed8921bc41',
  '/assets/uranius-placeholders/gallery.png?id=ea991ffa2cde8613',
  '/assets/uranius-placeholders/gallery.png?id=51c0f1148e76701f',
  '/assets/uranius-placeholders/gallery.png?id=cfc900cddcdae6d0',
  '/assets/uranius-placeholders/gallery.png?id=3b9d8682e809f3d0',
  '/assets/uranius-placeholders/gallery.png?id=9e25ae02a1e045cc',
  '/assets/uranius-placeholders/gallery.png?id=8f6a9ee784cda241',
]

const SCREENSHOTS: ScreenshotItem[] = SCREENSHOT_URLS.map((src, index) => ({
  src,
  index: index + 1,
}))

const PAGE_SIZE = 6

export default function ScreenshotGallery(): JSX.Element {
  const { t } = useTranslation('home')
  const [page, setPage] = useState(0)
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotItem | null>(null)

  const totalPages = Math.max(1, Math.ceil(SCREENSHOTS.length / PAGE_SIZE))

  const visibleScreenshots = useMemo(() => {
    const start = page * PAGE_SIZE
    return SCREENSHOTS.slice(start, start + PAGE_SIZE)
  }, [page])

  function screenshotAlt(item: ScreenshotItem): string {
    return `${t('screenshots.title')} ${item.index}`
  }

  function goPrevious() {
    setPage((currentPage) => {
      if (currentPage <= 0) return totalPages - 1
      return currentPage - 1
    })
  }

  function goNext() {
    setPage((currentPage) => {
      if (currentPage >= totalPages - 1) return 0
      return currentPage + 1
    })
  }

  function closePopup() {
    setSelectedScreenshot(null)
  }

  return (
    <section className="relative w-full overflow-hidden border-y border-yellow-400/15 bg-[#071426] py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <img
          src="/assets/uranius-placeholders/card.png?id=f6fc0c8b25f60999"
          alt=""
          className="h-full w-full object-cover"
          style={{
            opacity: 0.08,
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0) 100%)',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0) 100%)',
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#071426]/55 via-[#071426]/85 to-[#071426]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t('screenshots.title')}</h3>

            <p className="mt-2 max-w-2xl text-sm text-white/70">
              {t('screenshots.subtitle')}
            </p>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrevious}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:border-yellow-400 hover:text-yellow-400"
                aria-label={t('screenshots.previous')}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={goNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:border-yellow-400 hover:text-yellow-400"
                aria-label={t('screenshots.next')}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleScreenshots.map((img) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setSelectedScreenshot(img)}
              className="group overflow-hidden rounded-2xl border border-yellow-400/25 bg-[#14263f]/80 text-left shadow-[0_14px_35px_rgba(0,0,0,.27)] transition duration-300 hover:-translate-y-1 hover:border-yellow-400/75 hover:shadow-[0_8px_26px_rgba(250,204,21,.15)]"
            >
              <img
                src={img.src}
                alt={screenshotAlt(img)}
                className="h-56 w-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index)}
                className={[
                  'h-2.5 rounded-full transition-all',
                  index === page
                    ? 'w-8 bg-yellow-400'
                    : 'w-2.5 bg-white/30 hover:bg-white/60',
                ].join(' ')}
                aria-label={t('screenshots.openPage', { page: index + 1 })}
              />
            ))}
          </div>
        )}
      </div>

      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0"
          role="dialog"
          aria-modal="true"
          onClick={closePopup}
        >
          <button
            type="button"
            onClick={closePopup}
            className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/70 text-xl font-bold text-white shadow-lg hover:border-yellow-400 hover:text-yellow-400"
            aria-label={t('screenshots.close')}
          >
            ✕
          </button>

          <div
            className="flex h-screen w-screen items-center justify-center p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedScreenshot.src}
              alt={screenshotAlt(selectedScreenshot)}
              className="max-h-[96vh] max-w-[98vw] object-contain"
            />
          </div>
        </div>
      )}
    </section>
  )
}
