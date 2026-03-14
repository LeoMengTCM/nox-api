import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback, Card, CardContent } from '../ui';
import FollowButton from './follow-button';
import { getUserIdFromLocalStorage } from '../../lib/utils';

const UserCard = ({ user, isFollowing, onFollowChange }) => {
  const currentUserId = parseInt(getUserIdFromLocalStorage(), 10);
  const isSelf = currentUserId === user.id;
  const displayName = user.display_name || user.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <Link to={`/console/user/${user.id}`}>
            <Avatar size="lg">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback size="lg">{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={`/console/user/${user.id}`}
              className="text-sm font-medium text-text-primary hover:underline truncate block"
            >
              {displayName}
            </Link>
            {user.bio && (
              <p className="text-xs text-text-tertiary truncate mt-0.5">{user.bio}</p>
            )}
          </div>
          {!isSelf && (
            <FollowButton
              userId={user.id}
              initialFollowing={isFollowing}
              onFollowChange={onFollowChange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;
