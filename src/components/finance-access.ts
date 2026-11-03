import { getUser } from '../store/auth';
import { canOperate } from '../store/permissions';

export const canReviewFinance = () =>
  ['ADMIN', 'SUPER_ADMIN', 'CEO', 'DIRECTOR_OF_FINANCE'].includes(
    getUser()?.role || '',
  ) ||
  (getUser()?.role === 'ACCOUNTS' && canOperate());
