import { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/url-utils'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl()
  const currentDate = new Date()

  const routes = [
    {
      url: '',
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: '/demo',
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: '/etfs',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: '/cot-analysis',
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: '/about',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: '/contact',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ] as const;

  return routes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: currentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
