import React from 'react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)]"></div>
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]"></div>
      
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:space-x-12">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25"></div>
              <div className="relative bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
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
                    className="bg-white hover:bg-gray-50 text-gray-800 font-medium py-3 px-6 rounded-lg border border-gray-200 transition-all duration-300 transform hover:scale-105 text-center shadow-md hover:shadow-lg"
                  >
                    Contact Us
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:w-1/2">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative rounded-xl overflow-hidden shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500">
                <img 
                  src="https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                  alt="Business team working together" 
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-white"></div>
    </section>
  );
};

export default Hero;