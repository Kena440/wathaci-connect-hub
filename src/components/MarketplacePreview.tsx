import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Users, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

const MarketplacePreview = () => {
  return (
    <section className="py-16 px-6 bg-white/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-emerald-100 text-emerald-800 border-emerald-300">
            Professional Marketplace
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Connect. Collaborate. Grow.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join Zambia's premier professional services marketplace
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-xl transition-all">
            <CardHeader className="text-center">
              <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-2xl text-blue-900">Freelancer Directory</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-700 mb-4">
                Find verified professionals for governance, legal, and business services
              </p>
              <div className="flex justify-center items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600">500+ Verified Professionals</span>
              </div>
              <Link to="/marketplace">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Browse Professionals
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-xl transition-all">
            <CardHeader className="text-center">
              <ShoppingCart className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <CardTitle className="text-2xl text-emerald-900">SME Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-700 mb-4">
                Affordable monthly packages for ongoing business support
              </p>
              <div className="text-2xl font-bold text-emerald-600 mb-4">
                From ZMW 500/month
              </div>
              <Link to="/marketplace">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  View Packages
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-xl transition-all">
            <CardHeader className="text-center">
              <div className="text-4xl mb-4">🤝</div>
              <CardTitle className="text-2xl text-amber-900">Partnership Hub</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-700 mb-4">
                Collaborate with other professionals and share expertise
              </p>
              <div className="text-sm text-gray-600 mb-4">
                Skills Exchange • Joint Ventures
              </div>
              <Link to="/marketplace">
                <Button className="w-full bg-amber-600 hover:bg-amber-700">
                  Start Collaborating
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default MarketplacePreview;