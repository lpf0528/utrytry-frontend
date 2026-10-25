import store from '@/store';

/**
 * 判断当前用户是否拥有任一指定权限标识
 * @param {Array<string>} value 权限标识数组,如 ['user:create']
 * @returns {Boolean}
 */
export default function checkPermission(value) {
  if (value && value instanceof Array && value.length > 0) {
    const permissions = (store.user && store.user().permissions) || [];
    return permissions.some(p => value.includes(p));
  }
  console.error('need permissions! Like v-permission="[\'user:create\']"');
  return false;
}
