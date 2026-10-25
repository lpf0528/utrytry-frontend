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
import { defineComponent } from 'vue';
import store from '@/store';

export default defineComponent({
  name: 'Profile',
  components: { UserCard, Account },
  data() {
    return {
      user: {},
      activeTab: 'account'
    };
  },
  computed: {
    ...mapState(store.user, [
      'name',
      'avatar',
      'roles'
    ])
  },
  watch: {
    name(newVal) {
      this.user.name = newVal;
    }
  },
  created() {
    this.getUser();
  },
  methods: {
    getUser() {
      this.user = {
        name: this.name,
        role: this.roles.join(' | '),
        email: 'admin@test.com',
        avatar: this.avatar
      };
    }
  }
});
</script>
