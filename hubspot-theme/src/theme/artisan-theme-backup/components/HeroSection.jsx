import React from 'react';
import Container from './Container';
import Button from './Button';
import Badge from './Badge';

/**
 * HeroSection component
 * Featured collection banner with background image, CTA buttons, and stats
 */
const HeroSection = ({
  title = 'Ethereal Gold Collection',
  subtitle = 'Discover our meticulously crafted luxury jewelry pieces, handcrafted designed with 18k gold and ethically sourced gemstones. Each piece tells a unique story.',
  image,
  badgeText = 'Featured Collection',
  primaryCta = { text: 'Shop Collection', href: '/collection' },
  secondaryCta = { text: 'Learn More', href: '/about' },
  stats = [
    { value: '500+', label: 'Unique Pieces' },
    { value: '98%', label: 'Happy Customers' },
    { value: 'Handmade', label: 'With Care' },
  ],
  className = '',
}) => {
  return (
    <section className={`relative bg-beige overflow-hidden ${className}`}>
      <Container className="py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="space-y-6">
            {badgeText && (
              <Badge variant="featured" size="lg">
                {badgeText}
              </Badge>
            )}
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 leading-tight">
              {title}
            </h1>
            
            <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
              {subtitle}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => window.location.href = primaryCta.href}
              >
                {primaryCta.text}
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                onClick={() => window.location.href = secondaryCta.href}
              >
                {secondaryCta.text}
              </Button>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-8 border-t border-gray-200">
              {stats.map((stat, index) => (
                <div key={index} className="text-center sm:text-left">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Column - Product Image */}
          <div className="relative">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
              {image ? (
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                // Default placeholder
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-gray-800">
                  <div className="text-center text-white/80">
                    <p className="text-2xl font-display">Featured Product</p>
                  </div>
                </div>
              )}
              
              {/* Price Tag Overlay */}
              <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-lg px-6 py-4">
                <p className="text-sm text-gray-600">Starting at</p>
                <p className="text-3xl font-bold text-primary">$849</p>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -z-10 top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl" />
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HeroSection;

