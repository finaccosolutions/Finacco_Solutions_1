import React from 'react';
import { Briefcase, Calculator, Globe, Code, Database, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Services: React.FC = () => {
  const navigate = useNavigate();

  const handleTaxAssistantClick = () => {
    navigate('/tax-assistant');
  };

  const services = [
    {
      title: "Finacco Advisory",
      description: "Business consultancy services including GST, income tax, book keeping, TDS, TCS, company & LLP related services.",
      icon: Briefcase,
      link: "https://advisory.finaccosolutions.com",
      gradient: "from-blue-500 to-indigo-600",
      hoverBg: "group-hover:bg-blue-50"
    },
    {
      title: "Finacco Connect",
      description: "Business utility software including Tally import tool, financial statement preparation, and reconciliation tools.",
      icon: Calculator,
      link: "https://connect.finaccosolutions.com",
      gradient: "from-teal-500 to-emerald-600",
      hoverBg: "group-hover:bg-emerald-50"
    },
    {
      title: "Tax AI Assistant",
      description: "Intelligent tax assistant powered by AI to help with your tax-related queries and document generation.",
      icon: Calculator,
      onClick: handleTaxAssistantClick,
      gradient: "from-purple-500 to-pink-600",
      hoverBg: "group-hover:bg-purple-50"
    },
    {
      title: "Web Development",
      description: "Custom website design and development services to create a powerful online presence for your business.",
      icon: Globe,
      gradient: "from-orange-500 to-red-600",
      hoverBg: "group-hover:bg-orange-50"
    },
    {
      title: "Software Development",
      description: "Custom software solutions tailored to your business needs and requirements.",
      icon: Code,
      gradient: "from-cyan-500 to-blue-600",
      hoverBg: "group-hover:bg-cyan-50"
    },
    {
      title: "Tally Authorized Partner",
      description: "Official Tally solutions partner providing sales, implementation, and support services.",
      icon: Database,
      gradient: "from-amber-500 to-orange-600",
      hoverBg: "group-hover:bg-amber-50"
    }
  ];

  return (
    <section id="services" className="py-16 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)]"></div>
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">Our Services</h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Comprehensive financial and technology solutions to help your business grow and succeed
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="group h-[320px]">
              <div className="relative h-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2rem] blur opacity-0 group-hover:opacity-25 transition-all duration-500"></div>
                <div className={`relative h-full bg-white rounded-[2rem] shadow-lg p-6 transition-all duration-500 hover:shadow-2xl border border-gray-100 group-hover:border-transparent ${service.hoverBg}`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/5 to-blue-500/5 rounded-full transform -translate-x-8 translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>
                  
                  <div className="relative flex flex-col h-full">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${service.gradient} flex items-center justify-center mb-4 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                      <service.icon size={28} className="text-white transform group-hover:rotate-12 transition-transform duration-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r group-hover:bg-gradient-to-r from-gray-800 to-gray-600 group-hover:from-blue-600 group-hover:to-purple-600 transition-colors duration-300">{service.title}</h3>
                    <p className="text-base text-gray-600 group-hover:text-gray-700 transition-colors duration-300 flex-grow">{service.description}</p>
                    {service.link ? (
                      <a
                        href={service.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 py-2 px-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 text-gray-700 group-hover:text-blue-600 transition-all duration-300 group-hover:translate-x-2 text-base"
                      >
                        Learn More
                        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </a>
                    ) : service.onClick && (
                      <button
                        onClick={service.onClick}
                        className="inline-flex items-center mt-2 py-2 px-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 text-gray-700 group-hover:text-blue-600 transition-all duration-300 group-hover:translate-x-2 text-base"
                      >
                        Try Now
                        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;