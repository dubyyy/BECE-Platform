const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="container mx-auto px-4 py-8 xl:px-8 xl:py-12 2xl:px-12 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 xl:gap-12 text-sm xl:text-base">
          {/* Ministry Information */}
          <div>
            <h2 className="font-semibold text-base xl:text-lg mb-3 xl:mb-4 uppercase tracking-wide">
              Ministry Of Secondary School Education
            </h2>
            <p className="opacity-90 leading-relaxed">
              Delta State Government<br />
              Ministry Of Secondary School Education<br />
              Asaba, Delta State, Nigeria
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold text-base xl:text-lg mb-3 xl:mb-4 uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="space-y-2 opacity-90">
              <p>Email: info@dsgmope.ng</p>
              <p>Address: Ministry Secretariat, Asaba</p>
              <p>Telephone: +234 (0)901 234 5678</p>
            </div>
          </div>

          {/* Official Resources */}
          <div>
            <h3 className="font-semibold text-base xl:text-lg mb-3 xl:mb-4 uppercase tracking-wide">
              Official Resources
            </h3>
            <div className="space-y-2 opacity-90">
              <p>
                <a
                  href="https://www.dsgmope.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  www.dsgmope.ng
                </a>
              </p>
              <p>
                <a
                  href="https://www.deltastate.gov.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  Delta State Government Portal
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer and Copyright */}
        <div className="border-t border-primary-foreground/20 mt-6 pt-4">
          <p className="text-xs opacity-80 mb-3 leading-relaxed">
            <strong>OFFICIAL NOTICE:</strong> This is an official portal of the Delta State Government, 
            Ministry Of Secondary School Education. Unauthorized access, misuse, or tampering with this system 
            is prohibited and may be subject to legal action. All information provided is for official 
            purposes only.
          </p>
          <p className="text-xs opacity-70 text-center">
            &copy; {new Date().getFullYear()} Delta State Government, Ministry Of Secondary School Education. 
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
