import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="py-16 relative overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDUwIDAgTCAwIDAgMCA1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibHVlIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[3rem] blur opacity-30"></div>
            <div className="relative bg-white rounded-[3rem] shadow-xl p-8 md:p-12 border-8 border-blue-100/50 backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-teal-500/10 to-blue-500/10 rounded-full transform -translate-x-16 translate-y-16"></div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-8 text-center">About Finacco Solutions</h2>
              
              <div className="space-y-6 relative">
                <p className="text-gray-700 text-lg leading-relaxed">
                  At Finacco Solutions, we combine financial expertise with technological innovation to deliver comprehensive business solutions. With a focus on quality and client satisfaction, we've established ourselves as a trusted partner for businesses of all sizes. Our commitment to excellence and innovation drives us to provide cutting-edge solutions that help our clients succeed in today's dynamic business environment.
                </p>
                
                <p className="text-gray-700 text-lg leading-relaxed">
                  Our team of experienced professionals is dedicated to helping your business navigate financial complexities and leverage technology for growth. From financial advisory services to custom software development, we provide end-to-end solutions tailored to your specific needs. With years of industry experience and a deep understanding of both financial and technological landscapes, we're uniquely positioned to help your business thrive.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 transform hover:scale-105 transition-transform duration-300 border border-blue-100/50 shadow-lg hover:shadow-xl group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <h3 className="text-xl font-bold text-blue-600 mb-3">Our Mission</h3>
                    <p className="text-gray-700">
                      To empower businesses with innovative financial and technological solutions that drive growth and success in an ever-evolving digital landscape.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-6 transform hover:scale-105 transition-transform duration-300 border border-teal-100/50 shadow-lg hover:shadow-xl group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <h3 className="text-xl font-bold text-teal-600 mb-3">Our Vision</h3>
                    <p className="text-gray-700">
                      To be the leading provider of integrated business solutions, known for excellence, innovation, and our commitment to helping businesses achieve their full potential.
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <a 
                    href="#contact" 
                    className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:from-blue-700 hover:to-purple-700"
                  >
                    Get In Touch
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;