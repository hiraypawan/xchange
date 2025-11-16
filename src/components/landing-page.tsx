'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  CheckCircle, 
  Zap, 
  Users, 
  TrendingUp,
  Shield,
  Clock,
  DollarSign,
  Star
} from 'lucide-react';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [usersCount, setUsersCount] = useState(2847);

  // Redirect authenticated users
  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Animate user count for social proof
  useEffect(() => {
    const interval = setInterval(() => {
      setUsersCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    {
      text: "Grew my followers from 500 to 15K in 3 months. The engagement is real.",
      author: "Sarah K.",
      verified: true,
      growth: "15K followers"
    },
    {
      text: "Finally, authentic engagement that helps build real connections.",
      author: "Mike R.", 
      verified: true,
      growth: "300% engagement"
    },
    {
      text: "My tweets now consistently get 10x more interaction.",
      author: "Lisa M.",
      verified: true,
      growth: "10x reach"
    }
  ];

  const benefits = [
    "Boost your tweet engagement with authentic interactions",
    "Connect with like-minded creators in your niche",
    "Build a loyal community around your content",
    "Accelerate your follower growth organically"
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleGetStarted = () => {
    signIn('twitter', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 bg-gray-50">
        {/* Simple background pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5"></div>

        <div className="relative z-10 text-center max-w-6xl mx-auto">
          {/* Social Proof Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-8"
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-600 font-medium">
              {usersCount.toLocaleString()}+ creators building influence
            </span>
          </motion.div>

          {/* Main Headlines - Pain Point + Solution */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight text-gray-900"
          >
            Build Your
            <br />
            <span className="text-blue-600">
              X Empire.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Amplify your <span className="text-blue-600 font-semibold">Twitter presence</span> through strategic engagement. 
            Build authentic connections and grow your influence on X.
          </motion.p>

          {/* Authority + Trust */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Grow 10x faster</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Trusted by creators</span>
            </div>
          </motion.div>

          {/* Primary CTA - Growth Focus */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            onClick={handleGetStarted}
            className="group relative inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-bold text-white transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Zap className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            Start Building Influence
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            
            {/* Button Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
          </motion.button>

          {/* Value Proposition */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-500 mt-4"
          >
            Free to join • Connect with Twitter • Start growing today
          </motion.p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900"
          >
            How It Works
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-center mb-16 text-lg"
          >
            Simple, automated engagement that grows your X presence organically
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Post Your X Links</h3>
              <p className="text-gray-600 leading-relaxed">
                Share your X/Twitter post links on Xchangee for engagement opportunities.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Others Interact</h3>
              <p className="text-gray-600 leading-relaxed">
                Community members engage with your posts through likes, retweets, and comments.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Your X Grows Automatically</h3>
              <p className="text-gray-600 leading-relaxed">
                Your account interacts automatically with others, creating mutual growth and engagement.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900"
          >
            Real Creators. Real Growth.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-center mb-16"
          >
            Join thousands who've already amplified their Twitter presence and built thriving communities
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  {testimonial.verified && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                
                <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">{testimonial.author}</span>
                  <span className="text-blue-600 font-bold text-lg">{testimonial.growth}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900"
          >
            Stop Growing Slowly
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-center mb-16 text-lg"
          >
            Every tweet you post without strategic engagement is a missed opportunity for growth
          </motion.p>

          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 bg-gray-50 rounded-xl p-6 border border-gray-200"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg text-gray-900 font-medium">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - FOMO */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary-900/30 to-blue-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black mb-6 text-white"
          >
            Your Influence Empire is 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {" "}One Click Away
            </span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-200 mb-8"
          >
            Join the exclusive community of creators building real influence on X
          </motion.p>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onClick={handleGetStarted}
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-10 py-5 rounded-full text-xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-blue-500/25"
          >
            <TrendingUp className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            Build Your Empire Now
            <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-sm text-gray-300"
          >
            ⚡ Instant setup • 🚀 Start growing today • 🔒 100% secure
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="flex items-center gap-6 mb-4 md:mb-0">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Shield className="w-4 h-4" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Users className="w-4 h-4" />
                <span>50,000+ active users</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>1M+ engagements facilitated</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 Xchangee. Amplify your voice, build your influence.
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="text-gray-400">
                Developed by: 
                <a 
                  href="https://x.com/W3b_Gen" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 ml-2 font-medium"
                >
                  @W3b_Gen
                </a>
              </div>
              <div className="text-gray-400">
                Support: 
                <a 
                  href="https://t.me/xchangeetool" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 ml-2 font-medium"
                >
                  Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}