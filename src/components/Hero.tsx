import React from 'react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative pt-16 pb-16 md:pt-24 md:pb-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-white/5"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_100%)]"></div>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center md:space-x-12">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Complete <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">Financial</span> & <span className="bg-gradient-to-r from-purple-600 to-pink-500 text-transparent bg-clip-text">Tech</span> Solutions
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-xl">
              Expert business consultancy, software solutions, and development services to help your business grow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#services" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 text-center shadow-lg hover:shadow-blue-500/25"
              >
                Explore Services
              </a>
              <a 
                href="#contact" 
                className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 font-medium py-3 px-6 rounded-lg border border-gray-200 transition-all duration-300 transform hover:scale-105 text-center"
              >
                Contact Us
              </a>
            </div>
          </div>
          <div className="md:w-1/2">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <img 
                src="https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                alt="Business team working together" 
                className="relative rounded-lg shadow-2xl max-w-full h-auto transform group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;