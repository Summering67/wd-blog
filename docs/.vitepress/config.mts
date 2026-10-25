import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "wd的学习笔记",
  description: "Happy Study",
  base: '/wd-blog/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' },
      { text: '香港', link: '/香港/' },
      {
        text: '后端',
        items: [
          {
            text: 'Express',
            link: '/后端/Express后端开发入门指南'
          }
        ]
      }
    ],

    sidebar: {
      '/香港/': [
        {
          text: '香港',
          items: [
            { text: '专栏首页', link: '/香港/' }
          ]
        }
      ],
      '/后端/': [
        {
          text: 'Express',
          items: [
            { text: '入门指南', link: '/后端/Express后端开发入门指南' },
            { text: '进阶指南', link: '/后端/Express后端开发进阶指南' }
          ]
        }
      ],
      '/': [
        {
          text: 'Examples',
          items: [
            { text: 'Markdown Examples', link: '/markdown-examples' },
            { text: 'Runtime API Examples', link: '/api-examples' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
