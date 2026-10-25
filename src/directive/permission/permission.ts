import store from '@/store';

// 无权限时移除元素;value 为权限标识数组,拥有其中任意一个即显示
function checkPermission(el, binding) {
  const { value } = binding;
  const permissions = store.user().permissions;

  if (value && value instanceof Array) {
    if (value.length > 0) {
      const hasPermission = permissions.some(p => value.includes(p));
      if (!hasPermission && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
  } else {
    throw new Error('need permissions! Like v-permission="[\'user:create\']"');
  }
}

export default {
  mounted(el, binding) {
    checkPermission(el, binding);
  },
  updated(el, binding) {
    checkPermission(el, binding);
  }
};
