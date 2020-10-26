/*
 * tweaks
 * (c) 2020 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * under the MIT license
 */

'use strict';

module.exports = {
  id: 'cf8a7b27-5a4c-4d45-a4cb-1d2bbc9e9014',
  alwaysActive: true,
  tags: ['core', 'extension'],
  name: 'tweaks',
  desc: 'common style/layout changes.',
  version: '0.1.0',
  author: 'dragonwocky',
  options: [
    {
      key: 'dragarea_height',
      label: 'height of frameless dragarea:',
      description: `the rectangle added at the top of a window in "integrated titlebar" mode,
        used to drag/move the window.`,
      type: 'input',
      value: 15,
    },
    {
      key: 'responsive_breakpoint',
      label: 'width to wrap columns at:',
      description: `the size in pixels below which in-page columns are resized to appear
        full width so content isn't squished.`,
      type: 'input',
      value: 600,
    },
    {
      key: 'smooth_scrollbars',
      label: 'integrated scrollbars',
      description:
        "use scrollbars that fit better into notion's ui instead of the default chrome ones.",
      type: 'toggle',
      value: true,
    },
    {
      key: 'snappy_transitions',
      label: 'snappy transitions',
      type: 'toggle',
      value: false,
    },
    {
      key: 'thicker_bold',
      label: 'thicker bold text',
      type: 'toggle',
      value: false,
    },
    {
      key: 'hide_help',
      label: 'hide help button',
      type: 'toggle',
      value: false,
    },
  ],
  hacks: {
    'renderer/preload.js': (store, __exports) => {
      document.addEventListener('readystatechange', (event) => {
        if (document.readyState !== 'complete') return false;
        document.body.dataset.tweaks = [
          'smooth_scrollbars',
          'snappy_transitions',
          'hide_help',
          'thicker_bold',
        ]
          .filter((tweak) => store()[tweak])
          .map((tweak) => `[${tweak}]`)
          .join('');
        document.documentElement.style.setProperty(
          '--configured--dragarea_height',
          `${store().dragarea_height + 2}px`
        );
        const addResponsiveBreakpoint = () => {
          document.body.dataset.tweaks = document.body.dataset.tweaks.replace(
            /\[responsive_breakpoint\]/g,
            ''
          );
          if (window.outerWidth <= store().responsive_breakpoint)
            document.body.dataset.tweaks += '[responsive_breakpoint]';
        };
        window.addEventListener('resize', addResponsiveBreakpoint);
        addResponsiveBreakpoint();
      });
    },
  },
};