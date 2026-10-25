<template>
  <div class="app-container">
    <div v-if="user">
      <el-row :gutter="20">
        <el-col :span="6" :xs="24">
          <user-card :user="user" />
        </el-col>
        <el-col :span="18" :xs="24">
          <el-card>
            <el-tabs v-model="activeTab">
              <el-tab-pane label="账号信息" name="account">
                <account :user="user" />
              </el-tab-pane>
              <el-tab-pane label="修改密码" name="password">
                <password />
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import { mapState } from 'pinia';
import UserCard from './components/UserCard.vue';
import Account from './components/Account.vue';
import Password from './components/Password.vue';
import { defineComponent } from 'vue';
import store from '@/store';

export default defineComponent({
  name: 'Profile',
  components: { UserCard, Account, Password },
  data() {
    return {
      user: {},
      activeTab: 'account'
    };
  },
  computed: {
    ...mapState(store.user, [
      'username',
      'name',
      'avatar',
      'roles',
      'email',
      'phone',
      'introduction'
    ])
  },
  created() {
    this.getUser();
  },
  methods: {
    getUser() {
      this.user = {
        username: this.username,
        name: this.name,
        role: this.roles.join(' | '),
        email: this.email,
        phone: this.phone,
        introduction: this.introduction,
        avatar: this.avatar
      };
    }
  }
});
</script>
