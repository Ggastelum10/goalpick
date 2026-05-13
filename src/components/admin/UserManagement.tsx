import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminUsers, useAdminList, AdminUser } from '@/hooks/useAdminUsers';
import { usePromoteToAdmin, useRemoveAdmin } from '@/hooks/useManageUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Users, Shield, ShieldCheck, ShieldX, Search, UserPlus, Crown, Activity, CreditCard, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

type RoleFilter = 'all' | 'admin' | 'user';
type SortColumn = 'display_name' | 'email' | 'role' | 'created_at' | 'leagues_joined' | 'entry_fees_total' | 'platform_fees_count' | 'total_points';
type SortDirection = 'asc' | 'desc';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { data, isLoading } = useAdminUsers();
  const { data: admins } = useAdminList();
  const promoteToAdmin = usePromoteToAdmin();
  const removeAdmin = useRemoveAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('display_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [promoteSearch, setPromoteSearch] = useState('');
  const [selectedUserToPromote, setSelectedUserToPromote] = useState<string | null>(null);

  const users = data?.users || [];
  const stats = data?.stats || { totalUsers: 0, adminCount: 0, activeUsers: 0 };

  // Filter and sort users for the directory table
  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const matchesSearch = 
        user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    // Sort the filtered users
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'display_name':
          comparison = a.display_name.localeCompare(b.display_name);
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'leagues_joined':
          comparison = a.leagues_joined - b.leagues_joined;
          break;
        case 'entry_fees_total':
          comparison = a.entry_fees_total - b.entry_fees_total;
          break;
        case 'platform_fees_count':
          comparison = a.platform_fees_count - b.platform_fees_count;
          break;
        case 'total_points':
          comparison = a.total_points - b.total_points;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [users, searchQuery, roleFilter, sortColumn, sortDirection]);

  // Paginate the filtered and sorted users
  const totalPages = Math.ceil(filteredAndSortedUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedUsers, currentPage, pageSize]);

  // Reset to first page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (value: RoleFilter) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  // Filter non-admin users for promotion search
  const promotableUsers = useMemo(() => {
    if (!promoteSearch.trim()) return [];
    return users
      .filter(user => 
        user.role !== 'admin' && 
        user.display_name.toLowerCase().includes(promoteSearch.toLowerCase())
      )
      .slice(0, 5);
  }, [users, promoteSearch]);

  const handlePromote = () => {
    if (selectedUserToPromote) {
      promoteToAdmin.mutate(selectedUserToPromote);
      setSelectedUserToPromote(null);
      setPromoteSearch('');
    }
  };

  const handleRemoveAdmin = (userId: string) => {
    if (userId === currentUser?.id) {
      return; // Prevent removing self
    }
    removeAdmin.mutate(userId);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Crown className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{stats.adminCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <Activity className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Admin Permissions
          </CardTitle>
          <CardDescription>
            Manage which users have admin access to the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Admins List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Admins</h4>
            <div className="space-y-2">
              {admins?.map(admin => (
                <div 
                  key={admin.user_id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={admin.avatar_url || undefined} />
                      <AvatarFallback>
                        {admin.display_name?.charAt(0).toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{admin.display_name}</p>
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-primary" />
                        <span className="text-xs text-muted-foreground">Admin</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveAdmin(admin.user_id)}
                    disabled={admin.user_id === currentUser?.id || removeAdmin.isPending}
                  >
                    <ShieldX className="h-4 w-4 mr-1" />
                    {admin.user_id === currentUser?.id ? 'You' : 'Remove'}
                  </Button>
                </div>
              ))}
              {(!admins || admins.length === 0) && (
                <p className="text-sm text-muted-foreground">No admins found</p>
              )}
            </div>
          </div>

          {/* Add New Admin */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Add New Admin</h4>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search user by name..."
                  value={promoteSearch}
                  onChange={(e) => {
                    setPromoteSearch(e.target.value);
                    setSelectedUserToPromote(null);
                  }}
                  className="pl-9"
                />
                {promotableUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-popover shadow-lg z-10">
                    {promotableUsers.map(user => (
                      <button
                        key={user.user_id}
                        className={`w-full flex items-center gap-2 p-2 hover:bg-accent text-left ${
                          selectedUserToPromote === user.user_id ? 'bg-accent' : ''
                        }`}
                        onClick={() => {
                          setSelectedUserToPromote(user.user_id);
                          setPromoteSearch(user.display_name);
                        }}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.display_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={handlePromote}
                disabled={!selectedUserToPromote || promoteToAdmin.isPending}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Promote
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Directory Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> User Directory
          </CardTitle>
          <CardDescription>
            View all registered users and their activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => handleRoleFilterChange(v as RoleFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
                <SelectItem value="user">Regular Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('display_name')}
                  >
                    <div className="flex items-center">
                      User
                      <SortIcon column="display_name" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      Email
                      <SortIcon column="email" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center">
                      Role
                      <SortIcon column="role" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center">
                      Registered
                      <SortIcon column="created_at" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none text-center"
                    onClick={() => handleSort('leagues_joined')}
                  >
                    <div className="flex items-center justify-center">
                      Leagues
                      <SortIcon column="leagues_joined" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none text-center"
                    onClick={() => handleSort('entry_fees_total')}
                  >
                    <div className="flex items-center justify-center">
                      Entry Fees
                      <SortIcon column="entry_fees_total" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none text-center"
                    onClick={() => handleSort('platform_fees_count')}
                  >
                    <div className="flex items-center justify-center">
                      Platform Fees
                      <SortIcon column="platform_fees_count" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none text-right"
                    onClick={() => handleSort('total_points')}
                  >
                    <div className="flex items-center justify-end">
                      Points
                      <SortIcon column="total_points" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map(user => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.display_name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.email || '—'}
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <Badge variant="default" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {user.leagues_joined}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.entry_fees_total > 0 ? (
                          <span className="font-medium">${user.entry_fees_total.toFixed(0)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                            {user.platform_fees_count}
                          </div>
                          {user.platform_fees_total > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ${user.platform_fees_total.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {user.total_points}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} users
            </p>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
