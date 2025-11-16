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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Hero Section - Psychological Hook */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center max-w-6xl mx-auto">
          {/* Social Proof Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 mb-8"
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-400 font-medium">
              {usersCount.toLocaleString()}+ creators building influence
            </span>
          </motion.div>

          {/* Main Headlines - Pain Point + Solution */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight text-white"
          >
            Build Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              X Empire.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Amplify your <span className="text-blue-400 font-semibold">Twitter presence</span> through strategic engagement. 
            Build authentic connections and grow your influence on X.
          </motion.p>

          {/* Authority + Trust */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <div className="flex items-center gap-2 text-purple-400">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Grow 10x faster</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="flex items-center gap-2 text-blue-400">
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
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-full text-lg font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-blue-500/25"
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
            className="text-sm text-gray-300 mt-4"
          >
            Free to join • Connect with Twitter • Start growing today
          </motion.p>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-20 px-6 bg-black/50">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-4 text-white"
          >
            Real Creators. Real Growth.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-300 text-center mb-16"
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
                className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/70 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  {testimonial.verified && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                
                <p className="text-gray-300 mb-4 italic">"{testimonial.text}"</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{testimonial.author}</span>
                  <span className="text-blue-400 font-bold text-lg">{testimonial.growth}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits - Loss Aversion */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-4 text-white"
          >
            Stop Growing Slowly
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-300 text-center mb-16 text-lg"
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
                className="flex items-center gap-4 bg-gray-800/30 rounded-xl p-6 border border-gray-700/30"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg text-white font-medium">{benefit}</span>
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

      {/* Trust Indicators Footer */}
      <footer className="py-8 px-6 bg-black border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-6 mb-4 md:mb-0">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Users className="w-4 h-4" />
              <span>50,000+ active users</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>1M+ engagements facilitated</span>
            </div>
          </div>
          
          <div className="text-gray-500 text-sm">
            © 2024 Xchangee. Amplify your voice, build your influence.
          </div>
        </div>
      </footer>
    </div>
  );
}