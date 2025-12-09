import { TrendingUp, Users, DollarSign } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CreatorCardProps {
  name: string;
  handle: string;
  image: string;
  followers: string;
  sharePrice: string;
  volume: string;
  category: string;
}

export function CreatorCard({
  name,
  handle,
  image,
  followers,
  sharePrice,
  volume,
  category,
}: CreatorCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <ImageWithFallback
          src={image}
          alt={name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="truncate mb-1">{name}</h3>
          <p className="text-sm text-muted-foreground truncate">@{handle}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
            {category}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Users className="w-4 h-4" />
            Followers
          </span>
          <span>{followers}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            Share Price
          </span>
          <span className="text-primary">{sharePrice}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Volume
          </span>
          <span>{volume}</span>
        </div>
      </div>

      {/* CTA */}
      <button className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
        View Profile
      </button>
    </div>
  );
}
