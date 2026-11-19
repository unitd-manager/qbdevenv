import AboutNewClient from './AboutNewClient';
import './about-new.css';

export const revalidate = false;

export const metadata = {
  title: 'About qBotica | Built for Innovation. Driven by People.',
  description:
    'Discover the leadership, values, culture and community that shape qBotica — a UiPath Diamond Partner enabling organizations to become automation and future ready.',
};

export default function AboutNewPage() {
  return <AboutNewClient />;
}
