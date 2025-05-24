package models

// CVDetail represents the cv_details table in the database
type CVDetail struct {
	ID              string `json:"id" db:"id"`
	CVID            string `json:"cv_id" db:"cv_id"`
	HoTen           string `json:"ho_ten" db:"ho_ten"`
	ChucDanh        string `json:"chuc_danh" db:"chuc_danh"`
	AnhChanDung     string `json:"anh_chan_dung" db:"anh_chan_dung"`
	TomTat          string `json:"tom_tat" db:"tom_tat"`
	ThongTinCaNhan  string `json:"thong_tin_ca_nhan" db:"thong_tin_ca_nhan"`
	ThongTinDaoTao  string `json:"thong_tin_dao_tao" db:"thong_tin_dao_tao"`
	ThongTinKhoaHoc string `json:"thong_tin_khoa_hoc" db:"thong_tin_khoa_hoc"`
	ThongTinKiNang  string `json:"thong_tin_ki_nang" db:"thong_tin_ki_nang"`
}
